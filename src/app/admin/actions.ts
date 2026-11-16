"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { DAYS, fmtDateTime, fmtTime, hhmmToMin, minToHhmm, PAYMENT_METHODS } from "@/lib/format";
import { localToUtc, DATE_RE } from "@/lib/slots";
import { bookingInclude } from "@/lib/bookings";
import { notifyBooking, send } from "@/lib/mail";

function back(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

/** "15 000", "15.000", "₡15000" -> céntimos */
function parseColones(v: unknown) {
  const clean = String(v ?? "").replace(/[₡\s.]/g, "").replace(",", ".");
  if (clean === "") return 0;
  const n = Number(clean);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

// ---------- Servicios ----------

export async function saveService(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim() || null;
  const durationMin = Number(form.get("durationMin"));
  const priceCents = parseColones(form.get("price"));
  const active = form.get("active") === "on";
  if (!name) back("/admin/servicios", "El servicio necesita un nombre");
  if (!Number.isInteger(durationMin) || durationMin < 5 || durationMin > 600) back("/admin/servicios", "Duración inválida (minutos)");
  if (isNaN(priceCents)) back("/admin/servicios", "Precio inválido");
  const data = { name, description, durationMin, priceCents, active };
  if (id) await db.service.update({ where: { id }, data });
  else await db.service.create({ data });
  revalidatePath("/admin/servicios");
  redirect(`/admin/servicios?ok=${encodeURIComponent(id ? "Servicio actualizado" : "Servicio creado")}`);
}

export async function deleteService(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  const used = await db.booking.count({ where: { serviceId: id } });
  if (used > 0) back("/admin/servicios", "Este servicio tiene reservas. Ocúltalo (desmarca “Visible”) en lugar de borrarlo.");
  await db.service.delete({ where: { id } });
  revalidatePath("/admin/servicios");
  redirect(`/admin/servicios?ok=${encodeURIComponent("Servicio eliminado")}`);
}

// ---------- Horarios ----------

export async function addWorkingHours(form: FormData) {
  await requireAdmin();
  const days = form.getAll("day").map(Number).filter((d) => d >= 0 && d <= 6);
  const startMin = hhmmToMin(String(form.get("start") || ""));
  const endMin = hhmmToMin(String(form.get("end") || ""));
  if (days.length === 0) back("/admin/horarios", "Elige al menos un día");
  if (!(startMin >= 0 && endMin <= 24 * 60 && startMin < endMin)) back("/admin/horarios", "Rango de horas inválido");
  const existing = await db.workingHours.findMany({ where: { dayOfWeek: { in: days } } });
  const overlap = existing.find((r) => r.startMin < endMin && r.endMin > startMin);
  if (overlap) back("/admin/horarios", `Se encima con un rango existente del ${DAYS[overlap.dayOfWeek]}`);
  await db.workingHours.createMany({ data: days.map((dayOfWeek) => ({ dayOfWeek, startMin, endMin })) });
  revalidatePath("/admin/horarios");
  redirect(`/admin/horarios?ok=${encodeURIComponent("Horario agregado")}`);
}

export async function deleteWorkingHours(form: FormData) {
  await requireAdmin();
  await db.workingHours.delete({ where: { id: String(form.get("id")) } });
  revalidatePath("/admin/horarios");
}

// ---------- Bloqueos ----------

export type BlockInput = { startDate: string; startTime?: string; endDate?: string; endTime?: string; reason?: string };
export type ConflictItem = { id: string; when: string; service: string; client: string };

function parseBlock(input: BlockInput) {
  const startDate = input.startDate || "";
  const endDate = input.endDate || startDate;
  const sMin = hhmmToMin(input.startTime || "00:00");
  const eMin = input.endTime ? hhmmToMin(input.endTime) : 24 * 60;
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) return { error: "Fecha inválida" } as const;
  if (isNaN(sMin) || isNaN(eMin)) return { error: "Hora inválida" } as const;
  const start = localToUtc(startDate, sMin);
  const end = localToUtc(endDate, eMin);
  if (end <= start) return { error: "El fin debe ser después del inicio" } as const;
  return { start, end, reason: input.reason?.trim().slice(0, 120) || null } as const;
}

function conflictWhere(start: Date, end: Date) {
  return { status: "CONFIRMED" as const, start: { lt: end }, end: { gt: start } };
}

/** Citas confirmadas que caen dentro del bloqueo propuesto. */
export async function checkBlockConflicts(input: BlockInput): Promise<{ ok: false; error: string } | { ok: true; conflicts: ConflictItem[] }> {
  await requireAdmin();
  const p = parseBlock(input);
  if ("error" in p) return { ok: false, error: p.error! };
  const list = await db.booking.findMany({ where: conflictWhere(p.start, p.end), include: bookingInclude, orderBy: { start: "asc" } });
  return {
    ok: true,
    conflicts: list.map((b) => ({ id: b.id, when: fmtDateTime(b.start), service: b.service.name, client: b.user.name })),
  };
}

export async function createBlock(input: BlockInput & { cancelBookings?: boolean; notify?: boolean }): Promise<{ ok: boolean; error?: string; cancelled?: number }> {
  await requireAdmin();
  const p = parseBlock(input);
  if ("error" in p) return { ok: false, error: p.error };
  await db.blockedTime.create({ data: { start: p.start, end: p.end, reason: p.reason } });
  let cancelled = 0;
  if (input.cancelBookings) {
    const list = await db.booking.findMany({ where: conflictWhere(p.start, p.end), select: { id: true } });
    for (const { id } of list) {
      const b = await db.booking.update({ where: { id }, data: { status: "CANCELLED" }, include: bookingInclude });
      if (input.notify) await notifyBooking("cancelled", b);
      cancelled++;
    }
  }
  revalidatePath("/admin", "layout");
  return { ok: true, cancelled };
}

export async function deleteBlock(form: FormData) {
  await requireAdmin();
  await db.blockedTime.delete({ where: { id: String(form.get("id")) } });
  revalidatePath("/admin/bloqueos");
}

// ---------- Reservas (admin) ----------

const bookingSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  newClient: z
    .object({
      name: z.string().trim().min(2, "Escribe el nombre del cliente"),
      email: z.string().trim().toLowerCase().email("Correo del cliente inválido"),
      phone: z.string().trim().max(30).optional(),
    })
    .optional(),
  serviceId: z.string().uuid("Elige un servicio"),
  date: z.string().regex(DATE_RE, "Elige la fecha"),
  time: z.string().regex(/^\d{1,2}:\d{2}$/, "Elige la hora"),
  price: z.string().optional(),
  status: z.enum(["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]),
  paymentMethod: z.string().optional(),
  notes: z.string().max(500).optional(),
  notify: z.boolean().optional(),
  force: z.boolean().optional(),
});

export type AdminBookingInput = z.input<typeof bookingSchema>;
export type AdminBookingResult =
  | { ok: true; id: string; previewUrl?: string; mailed: boolean }
  | { ok: false; error: string }
  | { ok: false; warnings: string[] };

export async function saveAdminBooking(raw: AdminBookingInput): Promise<AdminBookingResult> {
  await requireAdmin();
  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const input = parsed.data;

  const service = await db.service.findUnique({ where: { id: input.serviceId } });
  if (!service) return { ok: false, error: "Ese servicio no existe" };
  const priceCents = input.price === undefined || input.price === "" ? service.priceCents : parseColones(input.price);
  if (isNaN(priceCents)) return { ok: false, error: "Precio inválido" };
  const paymentMethod = input.paymentMethod && PAYMENT_METHODS.includes(input.paymentMethod) ? input.paymentMethod : null;
  const startMin = hhmmToMin(input.time);
  const start = localToUtc(input.date, startMin);
  const end = new Date(start.getTime() + service.durationMin * 60_000);
  const existing = input.id ? await db.booking.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !existing) return { ok: false, error: "La reserva ya no existe" };

  // Avisos que el admin puede saltarse conscientemente.
  if (!input.force && input.status !== "CANCELLED") {
    const warnings: string[] = [];
    const [clashes, blocks, ranges] = await Promise.all([
      db.booking.findMany({
        where: { status: { in: ["CONFIRMED", "COMPLETED"] }, start: { lt: end }, end: { gt: start }, ...(input.id ? { id: { not: input.id } } : {}) },
        include: bookingInclude,
      }),
      db.blockedTime.findMany({ where: { start: { lt: end }, end: { gt: start } } }),
      db.workingHours.findMany({ where: { dayOfWeek: new Date(`${input.date}T12:00:00Z`).getUTCDay() } }),
    ]);
    for (const c of clashes) warnings.push(`Se cruza con ${c.service.name} de ${c.user.name} (${fmtTime(c.start)}–${fmtTime(c.end)}).`);
    for (const b of blocks) warnings.push(`Cae en un bloqueo${b.reason ? ` (${b.reason})` : ""}.`);
    const endMin = startMin + service.durationMin;
    if (!ranges.some((r) => r.startMin <= startMin && r.endMin >= endMin)) warnings.push(`Está fuera del horario de atención (${input.time}–${minToHhmm(endMin)}).`);
    if (warnings.length) return { ok: false, warnings };
  }

  // Cliente: existente o nuevo (sin contraseña; puede reclamar la cuenta registrándose con su correo).
  let userId = input.userId;
  if (!userId) {
    if (!input.newClient) return { ok: false, error: "Elige un cliente o crea uno nuevo" };
    const nc = input.newClient;
    const found = await db.user.findUnique({ where: { email: nc.email } });
    userId = found
      ? found.id
      : (await db.user.create({ data: { name: nc.name, email: nc.email, phone: nc.phone || null, passwordHash: null, role: "CLIENT" } })).id;
  }

  const data = { userId, serviceId: service.id, start, end, priceCents, status: input.status, paymentMethod, notes: input.notes?.trim() || null };
  const saved = existing
    ? await db.booking.update({ where: { id: existing.id }, data, include: bookingInclude })
    : await db.booking.create({ data, include: bookingInclude });

  let event: "created" | "rescheduled" | "cancelled" | null = null;
  if (!existing) event = saved.status === "CANCELLED" ? null : "created";
  else if (saved.status === "CANCELLED" && existing.status !== "CANCELLED") event = "cancelled";
  else if (saved.status === "CONFIRMED" && existing.start.getTime() !== saved.start.getTime()) event = "rescheduled";
  let mail: { ok: boolean; previewUrl?: string } = { ok: false };
  if (event && input.notify && saved.start > new Date()) mail = await notifyBooking(event, saved);

  revalidatePath("/admin", "layout");
  return { ok: true, id: saved.id, previewUrl: mail.previewUrl, mailed: mail.ok };
}

/** Cambio rápido de estado desde la lista o el detalle. */
export async function setBookingStatus(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  const status = String(form.get("status") || "");
  const back = String(form.get("back") || "/admin/reservas");
  if (!["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"].includes(status)) return;
  const prev = await db.booking.findUnique({ where: { id } });
  if (!prev) return;
  const b = await db.booking.update({ where: { id }, data: { status: status as "CONFIRMED" }, include: bookingInclude });
  if (status === "CANCELLED" && prev.status !== "CANCELLED" && form.get("notify") === "on" && b.start > new Date()) await notifyBooking("cancelled", b);
  revalidatePath("/admin", "layout");
  const safe = back.startsWith("/admin") ? back : "/admin/reservas";
  redirect(`${safe}${safe.includes("?") ? "&" : "?"}ok=${encodeURIComponent("Estado actualizado")}`);
}

/** Marca como realizadas todas las citas confirmadas cuyo horario ya pasó. */
export async function closePastBookings() {
  await requireAdmin();
  const r = await db.booking.updateMany({ where: { status: "CONFIRMED", end: { lte: new Date() } }, data: { status: "COMPLETED" } });
  revalidatePath("/admin", "layout");
  redirect(`/admin/reservas?ok=${encodeURIComponent(`${r.count} cita(s) marcadas como realizadas`)}`);
}

// ---------- Correo ----------

export async function sendTestMail(to: string): Promise<{ ok: boolean; error?: string; previewUrl?: string }> {
  await requireAdmin();
  const email = z.string().trim().email().safeParse(to);
  if (!email.success) return { ok: false, error: "Correo inválido" };
  const when = formatInTimeZone(new Date(), config.tz, "dd/MM/yyyy HH:mm");
  const r = await send(email.data, `Correo de prueba · ${config.businessName}`, `<p>¡Funciona! 🎉</p><p>Este es un correo de prueba enviado el ${when}.</p>`);
  revalidatePath("/admin/correo");
  return r;
}

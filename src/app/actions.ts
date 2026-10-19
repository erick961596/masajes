"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getUser, requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { notifyBooking } from "@/lib/mail";
import { bookingInclude, reserveSlot, SlotTakenError } from "@/lib/bookings";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; code?: "slot_taken" | "auth" };

function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/cuenta";
}

function back(path: string, error: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}error=${encodeURIComponent(error)}`);
}

// ---------- Cuentas ----------

const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre"),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

type PublicUser = { name: string; email: string; role: "ADMIN" | "CLIENT" };

export async function registerAccount(input: Record<string, unknown>): Promise<Result<{ user: PublicUser }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { name, email, phone, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { ok: false, error: "Ese correo ya tiene cuenta. Entra con tu contraseña." };
  const user = await db.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash: await bcrypt.hash(password, 10),
      role: config.adminEmail && email === config.adminEmail ? "ADMIN" : "CLIENT",
    },
  });
  await createSession(user.id);
  return { ok: true, user: { name: user.name, email: user.email, role: user.role } };
}

export async function loginAccount(input: { email?: string; password?: string }): Promise<Result<{ user: PublicUser }>> {
  const email = String(input.email || "").trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(String(input.password || ""), user.passwordHash))) {
    return { ok: false, error: "Correo o contraseña incorrectos" };
  }
  await createSession(user.id);
  return { ok: true, user: { name: user.name, email: user.email, role: user.role } };
}

function landing(role: string, next: string) {
  return role === "ADMIN" && next === "/cuenta" ? "/admin" : next;
}

export async function register(form: FormData) {
  const next = safeNext(form.get("next"));
  const r = await registerAccount(Object.fromEntries(form));
  if (!r.ok) back(`/registro?next=${encodeURIComponent(next)}`, r.error);
  redirect(landing(r.user.role, next));
}

export async function login(form: FormData) {
  const next = safeNext(form.get("next"));
  const r = await loginAccount({ email: String(form.get("email") || ""), password: String(form.get("password") || "") });
  if (!r.ok) back(`/login?next=${encodeURIComponent(next)}`, r.error);
  redirect(landing(r.user.role, next));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ---------- Reservas ----------

function parseStart(v: unknown) {
  const d = new Date(String(v || ""));
  return isNaN(d.getTime()) ? null : d;
}

export async function bookAction(input: { serviceId: string; start: string; notes?: string }): Promise<Result<{ id: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Inicia sesión para confirmar tu reserva", code: "auth" };
  const start = parseStart(input.start);
  if (!start) return { ok: false, error: "Horario inválido" };
  const service = await db.service.findFirst({ where: { id: input.serviceId, active: true } }).catch(() => null);
  if (!service) return { ok: false, error: "Ese servicio ya no está disponible" };
  const notes = String(input.notes || "").trim().slice(0, 500) || null;

  let id: string;
  try {
    ({ id } = await reserveSlot({
      start,
      durationMin: service.durationMin,
      write: (tx, end) =>
        tx.booking.create({
          data: { userId: user.id, serviceId: service.id, start, end, priceCents: service.priceCents, notes },
          select: { id: true },
        }),
    }));
  } catch (err) {
    if (err instanceof SlotTakenError) return { ok: false, error: "Ese horario se acaba de ocupar. Elige otro, por favor.", code: "slot_taken" };
    throw err;
  }
  const booking = await db.booking.findUniqueOrThrow({ where: { id }, include: bookingInclude });
  await notifyBooking("created", booking);
  return { ok: true, id };
}

async function loadOwnBooking(id: string) {
  const user = await requireUser(`/reserva/${id}`);
  const booking = await db.booking
    .findUnique({ where: { id }, include: { ...bookingInclude, service: true } })
    .catch(() => null);
  if (!booking || (booking.userId !== user.id && user.role !== "ADMIN")) redirect("/cuenta");
  return { user, booking };
}

export async function rescheduleAction(input: { id: string; start: string }): Promise<Result> {
  const { booking } = await loadOwnBooking(input.id);
  const start = parseStart(input.start);
  if (booking.status !== "CONFIRMED" || booking.start <= new Date()) return { ok: false, error: "Esta reserva ya no se puede reagendar" };
  if (!start) return { ok: false, error: "Horario inválido" };
  try {
    await reserveSlot({
      start,
      durationMin: booking.service.durationMin,
      excludeBookingId: booking.id,
      write: (tx, end) => tx.booking.update({ where: { id: booking.id }, data: { start, end }, select: { id: true } }),
    });
  } catch (err) {
    if (err instanceof SlotTakenError) return { ok: false, error: "Ese horario se acaba de ocupar. Elige otro, por favor.", code: "slot_taken" };
    throw err;
  }
  const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  await notifyBooking("rescheduled", updated);
  return { ok: true };
}

export async function cancelBooking(form: FormData) {
  const id = String(form.get("id") || "");
  const { booking } = await loadOwnBooking(id);
  if (booking.status !== "CONFIRMED" || booking.start <= new Date()) back(`/reserva/${id}`, "Esta reserva ya no se puede cancelar");
  const updated = await db.booking.update({ where: { id }, data: { status: "CANCELLED" }, include: bookingInclude });
  await notifyBooking("cancelled", updated);
  redirect(`/reserva/${id}?ok=cancelada`);
}

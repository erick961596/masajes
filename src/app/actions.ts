"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { notifyBooking } from "@/lib/mail";
import { bookingInclude, reserveSlot, SlotTakenError } from "@/lib/bookings";

function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/cuenta";
}

function back(path: string, error: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}error=${encodeURIComponent(error)}`);
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre"),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export async function register(form: FormData) {
  const next = safeNext(form.get("next"));
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) back(`/registro?next=${encodeURIComponent(next)}`, parsed.error.issues[0].message);
  const { name, email, phone, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) back(`/registro?next=${encodeURIComponent(next)}`, "Ese correo ya tiene cuenta");
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
  redirect(user.role === "ADMIN" && next === "/cuenta" ? "/admin" : next);
}

export async function login(form: FormData) {
  const next = safeNext(form.get("next"));
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    back(`/login?next=${encodeURIComponent(next)}`, "Correo o contraseña incorrectos");
  }
  await createSession(user.id);
  redirect(user.role === "ADMIN" && next === "/cuenta" ? "/admin" : next);
}

export async function logout() {
  await destroySession();
  redirect("/");
}

function parseStart(v: FormDataEntryValue | null) {
  const d = new Date(String(v || ""));
  return isNaN(d.getTime()) ? null : d;
}

export async function createBooking(form: FormData) {
  const serviceId = String(form.get("serviceId") || "");
  const user = await requireUser(`/reservar/${serviceId}`);
  const start = parseStart(form.get("start"));
  const notes = String(form.get("notes") || "").trim().slice(0, 500) || null;
  const service = await db.service.findFirst({ where: { id: serviceId, active: true } }).catch(() => null);
  if (!service) redirect("/");
  if (!start) back(`/reservar/${serviceId}`, "Horario inválido");

  let id: string;
  try {
    ({ id } = await reserveSlot({
      start,
      durationMin: service.durationMin,
      write: (tx, end) =>
        tx.booking.create({
          data: { userId: user.id, serviceId, start, end, priceCents: service.priceCents, notes },
          select: { id: true },
        }),
    }));
  } catch (err) {
    if (err instanceof SlotTakenError) back(`/reservar/${serviceId}`, "Ese horario ya no está disponible, elige otro");
    throw err;
  }
  const booking = await db.booking.findUniqueOrThrow({ where: { id }, include: bookingInclude });
  await notifyBooking("created", booking);
  redirect(`/reserva/${id}?ok=creada`);
}

async function loadOwnBooking(id: string) {
  const user = await requireUser(`/reserva/${id}`);
  const booking = await db.booking
    .findUnique({ where: { id }, include: { ...bookingInclude, service: true } })
    .catch(() => null);
  if (!booking || (booking.userId !== user.id && user.role !== "ADMIN")) redirect("/cuenta");
  return { user, booking };
}

export async function rescheduleBooking(form: FormData) {
  const id = String(form.get("id") || "");
  const { booking } = await loadOwnBooking(id);
  const start = parseStart(form.get("start"));
  if (booking.status !== "CONFIRMED" || booking.start <= new Date()) back(`/reserva/${id}`, "Esta reserva ya no se puede reagendar");
  if (!start) back(`/reserva/${id}/reagendar`, "Horario inválido");
  try {
    await reserveSlot({
      start,
      durationMin: booking.service.durationMin,
      excludeBookingId: id,
      write: (tx, end) => tx.booking.update({ where: { id }, data: { start, end }, select: { id: true } }),
    });
  } catch (err) {
    if (err instanceof SlotTakenError) back(`/reserva/${id}/reagendar`, "Ese horario ya no está disponible, elige otro");
    throw err;
  }
  const updated = await db.booking.findUniqueOrThrow({ where: { id }, include: bookingInclude });
  await notifyBooking("rescheduled", updated);
  redirect(`/reserva/${id}?ok=reagendada`);
}

export async function cancelBooking(form: FormData) {
  const id = String(form.get("id") || "");
  const { booking } = await loadOwnBooking(id);
  if (booking.status !== "CONFIRMED" || booking.start <= new Date()) back(`/reserva/${id}`, "Esta reserva ya no se puede cancelar");
  const updated = await db.booking.update({ where: { id }, data: { status: "CANCELLED" }, include: bookingInclude });
  await notifyBooking("cancelled", updated);
  redirect(`/reserva/${id}?ok=cancelada`);
}

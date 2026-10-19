"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DAYS, hhmmToMin } from "@/lib/format";
import { localToUtc, DATE_RE } from "@/lib/slots";

function back(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

export async function saveService(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim() || null;
  const durationMin = Number(form.get("durationMin"));
  const price = Number(String(form.get("price") || "").replace(",", "."));
  const active = form.get("active") === "on";
  if (!name) back("/admin/servicios", "El servicio necesita un nombre");
  if (!Number.isInteger(durationMin) || durationMin < 5 || durationMin > 600) back("/admin/servicios", "Duración inválida (minutos)");
  if (!Number.isFinite(price) || price < 0) back("/admin/servicios", "Precio inválido");
  const data = { name, description, durationMin, priceCents: Math.round(price * 100), active };
  if (id) await db.service.update({ where: { id }, data });
  else await db.service.create({ data });
  revalidatePath("/admin/servicios");
  redirect("/admin/servicios");
}

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
  redirect("/admin/horarios");
}

export async function deleteWorkingHours(form: FormData) {
  await requireAdmin();
  await db.workingHours.delete({ where: { id: String(form.get("id")) } });
  revalidatePath("/admin/horarios");
}

export async function addBlock(form: FormData) {
  await requireAdmin();
  const startDate = String(form.get("startDate") || "");
  const endDate = String(form.get("endDate") || "") || startDate;
  const startTime = String(form.get("startTime") || "") || "00:00";
  const endTime = String(form.get("endTime") || "") || "24:00";
  const reason = String(form.get("reason") || "").trim() || null;
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) back("/admin/bloqueos", "Fecha inválida");
  const sMin = hhmmToMin(startTime);
  const eMin = hhmmToMin(endTime);
  if (isNaN(sMin) || isNaN(eMin)) back("/admin/bloqueos", "Hora inválida");
  const start = localToUtc(startDate, sMin);
  const end = localToUtc(endDate, eMin);
  if (end <= start) back("/admin/bloqueos", "El fin debe ser después del inicio");
  await db.blockedTime.create({ data: { start, end, reason } });
  revalidatePath("/admin/bloqueos");
  redirect("/admin/bloqueos");
}

export async function deleteBlock(form: FormData) {
  await requireAdmin();
  await db.blockedTime.delete({ where: { id: String(form.get("id")) } });
  revalidatePath("/admin/bloqueos");
}

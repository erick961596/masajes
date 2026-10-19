import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";
import { db } from "./db";
import { config } from "./config";
import { minToHhmm } from "./format";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de hoy (YYYY-MM-DD) en la zona del negocio. */
export function todayStr() {
  return formatInTimeZone(new Date(), config.tz, "yyyy-MM-dd");
}

export function shiftDate(dateStr: string, days: number) {
  return formatInTimeZone(addDays(new Date(`${dateStr}T12:00:00Z`), days), "UTC", "yyyy-MM-dd");
}

export function localToUtc(dateStr: string, minutes: number) {
  if (minutes >= 1440) return localToUtc(shiftDate(dateStr, Math.floor(minutes / 1440)), minutes % 1440);
  return fromZonedTime(`${dateStr}T${minToHhmm(minutes)}:00`, config.tz);
}

/**
 * Horarios libres de un día para una duración dada.
 * Se asume una sola persona atendiendo: cualquier reserva confirmada ocupa el horario.
 */
export async function availableSlots(dateStr: string, durationMin: number, excludeBookingId?: string) {
  if (!DATE_RE.test(dateStr)) return [];
  const dayOfWeek = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  const ranges = await db.workingHours.findMany({ where: { dayOfWeek }, orderBy: { startMin: "asc" } });
  if (ranges.length === 0) return [];

  const dayStart = localToUtc(dateStr, 0);
  const dayEnd = localToUtc(shiftDate(dateStr, 1), 0);
  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({
      where: {
        status: "CONFIRMED",
        start: { lt: dayEnd },
        end: { gt: dayStart },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { start: true, end: true },
    }),
    db.blockedTime.findMany({ where: { start: { lt: dayEnd }, end: { gt: dayStart } }, select: { start: true, end: true } }),
  ]);
  const busy = [...bookings, ...blocks];
  const now = new Date();

  const slots: Date[] = [];
  for (const r of ranges) {
    for (let m = r.startMin; m + durationMin <= r.endMin; m += config.slotStepMin) {
      const start = localToUtc(dateStr, m);
      const end = new Date(start.getTime() + durationMin * 60_000);
      if (start <= now) continue;
      if (busy.some((b) => b.start < end && b.end > start)) continue;
      slots.push(start);
    }
  }
  return slots;
}

/** ¿El intervalo cae dentro del horario y está libre? Se usa al confirmar. */
export async function isSlotAvailable(start: Date, durationMin: number, excludeBookingId?: string) {
  const dateStr = formatInTimeZone(start, config.tz, "yyyy-MM-dd");
  const slots = await availableSlots(dateStr, durationMin, excludeBookingId);
  return slots.some((s) => s.getTime() === start.getTime());
}

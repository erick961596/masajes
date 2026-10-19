import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { db } from "./db";
import { shiftDate, todayStr } from "./slots";

export type DayOption = { date: string; dow: string; day: string; month: string; long: string; open: boolean };

/** Los próximos `count` días, marcando cuáles tienen horario de atención. */
export async function upcomingDays(count = 28): Promise<DayOption[]> {
  const open = new Set((await db.workingHours.findMany({ select: { dayOfWeek: true } })).map((r) => r.dayOfWeek));
  const today = todayStr();
  return Array.from({ length: count }, (_, i) => {
    const date = shiftDate(today, i);
    const d = new Date(`${date}T12:00:00Z`);
    return {
      date,
      dow: i === 0 ? "Hoy" : i === 1 ? "Mañana" : formatInTimeZone(d, "UTC", "EEE", { locale: es }).replace(".", ""),
      day: formatInTimeZone(d, "UTC", "d"),
      month: formatInTimeZone(d, "UTC", "MMM", { locale: es }).replace(".", ""),
      long: formatInTimeZone(d, "UTC", "EEEE d 'de' MMMM", { locale: es }),
      open: open.has(d.getUTCDay()),
    };
  });
}

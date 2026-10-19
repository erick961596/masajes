import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { config } from "./config";

export function money(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: config.currency }).format(cents / 100);
}

export function fmtDateTime(d: Date) {
  return formatInTimeZone(d, config.tz, "EEEE d 'de' MMMM yyyy, HH:mm", { locale: es });
}

export function fmtTime(d: Date) {
  return formatInTimeZone(d, config.tz, "HH:mm");
}

export function fmtDay(dateStr: string) {
  return formatInTimeZone(new Date(`${dateStr}T12:00:00Z`), "UTC", "EEEE d 'de' MMMM", { locale: es });
}

/** "09:30" -> 570 */
export function hhmmToMin(v: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minToHhmm(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

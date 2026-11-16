import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { config } from "./config";

const crc = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Precio en colones: ₡15 000. 0 = "Precio a consultar". */
export function money(cents: number) {
  if (cents === 0) return "Precio a consultar";
  return colones(cents);
}

/** Como money() pero 0 se muestra ₡0 (para totales y reportes). */
export function colones(cents: number) {
  return crc.format(Math.round(cents / 100));
}

/** Monto corto para ejes y gráficos: ₡850 mil, ₡1,2 M. */
export function colonesShort(cents: number) {
  const v = cents / 100;
  if (Math.abs(v) >= 1_000_000) return `₡${(v / 1_000_000).toLocaleString("es-CR", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(v) >= 1_000) return `₡${Math.round(v / 1_000).toLocaleString("es-CR")} mil`;
  return `₡${Math.round(v)}`;
}

export type Status = "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";

export const STATUS_LABEL: Record<Status, string> = {
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  NO_SHOW: "No asistió",
  CANCELLED: "Cancelada",
};

/** Badge de estado. Una cita confirmada cuyo horario ya pasó se muestra como "Por cerrar" al admin y "Realizada" al cliente. */
export function statusBadge(status: Status, start: Date, admin = false): [string, string] {
  if (status === "CONFIRMED" && start <= new Date()) return admin ? ["warn", "Por cerrar"] : ["past", "Realizada"];
  const cls: Record<Status, string> = { CONFIRMED: "", COMPLETED: "done", NO_SHOW: "noshow", CANCELLED: "cancelled" };
  return [cls[status], STATUS_LABEL[status]];
}

export const PAYMENT_METHODS = ["Efectivo", "SINPE Móvil", "Tarjeta", "Transferencia"];

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

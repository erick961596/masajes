import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { config } from "@/lib/config";
import { colones, fmtTime, statusBadge, type Status } from "@/lib/format";

export type RowBooking = {
  id: string;
  start: Date;
  end: Date;
  status: Status;
  priceCents: number;
  paymentMethod: string | null;
  service: { name: string };
  user: { name: string; email: string; phone: string | null };
};

/** Fila de reserva para el admin: tarjeta en celular, fila de tabla en escritorio. */
export function BookingRow({ b, showDate = false }: { b: RowBooking; showDate?: boolean }) {
  const [cls, label] = statusBadge(b.status, b.start, true);
  return (
    <Link href={`/admin/reservas/${b.id}`} className={`bk-row ${b.status === "CANCELLED" ? "is-cancelled" : ""}`}>
      <div className="bk-when">
        {showDate && <span className="bk-date capitalize">{formatInTimeZone(b.start, config.tz, "EEE d MMM", { locale: es }).replace(/\./g, "")}</span>}
        <strong>{fmtTime(b.start)}</strong>
        <span className="muted">{fmtTime(b.end)}</span>
      </div>
      <div className="bk-main">
        <span className="bk-service">{b.service.name}</span>
        <span className="bk-client">
          {b.user.name}
          {b.user.phone ? <span className="muted"> · {b.user.phone}</span> : null}
        </span>
      </div>
      <div className="bk-side">
        <span className="bk-price">{colones(b.priceCents)}</span>
        <span className={`badge ${cls}`}>{label}</span>
      </div>
    </Link>
  );
}

export const rowInclude = {
  service: { select: { name: true } },
  user: { select: { name: true, email: true, phone: true } },
} as const;

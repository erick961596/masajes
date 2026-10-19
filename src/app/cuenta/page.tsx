import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { fmtDateTime, fmtTime, money } from "@/lib/format";

export const metadata = { title: "Mis citas" };

export default async function AccountPage() {
  const user = await requireUser("/cuenta");
  const bookings = await db.booking.findMany({
    where: { userId: user.id },
    include: { service: { select: { name: true } } },
    orderBy: { start: "desc" },
  });
  const now = new Date();
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && b.start > now).reverse();
  const past = bookings.filter((b) => !(b.status === "CONFIRMED" && b.start > now));

  return (
    <div className="medium">
      <div className="page-head">
        <h1>Hola, {user.name.split(" ")[0]}</h1>
        <p className="muted">Aquí están tus citas.</p>
      </div>
      <h2>Próximas</h2>
      {upcoming.length === 0 && (
        <div className="card empty">
          <p>No tienes citas próximas.</p>
          <Link className="btn" href="/reservar">
            Reservar una cita
          </Link>
        </div>
      )}
      {upcoming.map((b) => (
        <Link key={b.id} href={`/reserva/${b.id}`} className="card booking-item" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="date-box">
            <span className="num">{formatInTimeZone(b.start, config.tz, "d")}</span>
            <span className="mon">{formatInTimeZone(b.start, config.tz, "MMM", { locale: es }).replace(".", "")}</span>
          </div>
          <div className="info">
            <h3>{b.service.name}</h3>
            <span className="muted capitalize">
              {formatInTimeZone(b.start, config.tz, "EEEE", { locale: es })} · {fmtTime(b.start)} · {money(b.priceCents)}
            </span>
          </div>
          <span className="btn ghost small">Ver</span>
        </Link>
      ))}
      {past.length > 0 && (
        <>
          <h2>Historial</h2>
          <div className="card table-wrap">
            <table>
              <tbody>
                {past.map((b) => (
                  <tr key={b.id}>
                    <td>{b.service.name}</td>
                    <td className="capitalize muted">{fmtDateTime(b.start)}</td>
                    <td>
                      <Link href={`/reserva/${b.id}`}>
                        <span className={`badge ${b.status === "CANCELLED" ? "cancelled" : "past"}`}>{b.status === "CANCELLED" ? "Cancelada" : "Realizada"}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

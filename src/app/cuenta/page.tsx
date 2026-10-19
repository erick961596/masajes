import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime, money } from "@/lib/format";

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
    <>
      <h1>Hola, {user.name}</h1>
      <h2>Próximas reservas</h2>
      {upcoming.length === 0 && (
        <p className="muted">
          No tienes reservas próximas. <Link href="/">Reserva una sesión</Link>.
        </p>
      )}
      {upcoming.map((b) => (
        <div key={b.id} className="card row" style={{ justifyContent: "space-between" }}>
          <div>
            <strong>{b.service.name}</strong>
            <div className="capitalize">{fmtDateTime(b.start)}</div>
            <div className="muted">{money(b.priceCents)}</div>
          </div>
          <Link className="btn secondary" href={`/reserva/${b.id}`}>
            Gestionar
          </Link>
        </div>
      ))}
      {past.length > 0 && (
        <>
          <h2>Historial</h2>
          <div className="table-wrap card">
            <table>
              <tbody>
                {past.map((b) => (
                  <tr key={b.id}>
                    <td>{b.service.name}</td>
                    <td className="capitalize">{fmtDateTime(b.start)}</td>
                    <td>
                      <Link href={`/reserva/${b.id}`}>{b.status === "CANCELLED" ? "Cancelada" : "Realizada"}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

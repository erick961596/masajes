import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDateTime, fmtDay, money } from "@/lib/format";
import { localToUtc, shiftDate, todayStr, DATE_RE } from "@/lib/slots";
import { SP, str } from "@/components/Notice";

export default async function AdminAgenda({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const from = DATE_RE.test(str(sp.desde) || "") ? str(sp.desde)! : todayStr();
  const to = shiftDate(from, 7);
  const bookings = await db.booking.findMany({
    where: { start: { gte: localToUtc(from, 0), lt: localToUtc(to, 0) } },
    include: { service: { select: { name: true } }, user: { select: { name: true, email: true, phone: true } } },
    orderBy: { start: "asc" },
  });
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");

  return (
    <>
      <h1>Agenda</h1>
      <form method="get" className="row">
        <label>
          Semana desde
          <input type="date" name="desde" defaultValue={from} />
        </label>
        <button className="secondary">Ver</button>
        <Link className="btn secondary" href={`/admin?desde=${shiftDate(from, -7)}`}>← Semana anterior</Link>
        <Link className="btn secondary" href={`/admin?desde=${to}`}>Semana siguiente →</Link>
      </form>
      <p className="muted capitalize">
        {fmtDay(from)} – {fmtDay(shiftDate(to, -1))} · {confirmed.length} confirmadas · {money(confirmed.reduce((s, b) => s + b.priceCents, 0))}
      </p>
      {bookings.length === 0 ? (
        <p className="muted">Sin reservas en esta semana.</p>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Servicio</th><th>Cliente</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="capitalize">{fmtDateTime(b.start)}</td>
                  <td>{b.service.name}<div className="muted">{money(b.priceCents)}</div></td>
                  <td>{b.user.name}<div className="muted">{b.user.email}{b.user.phone ? ` · ${b.user.phone}` : ""}</div></td>
                  <td><span className={`badge ${b.status === "CANCELLED" ? "cancelled" : ""}`}>{b.status === "CANCELLED" ? "Cancelada" : "Confirmada"}</span></td>
                  <td><Link href={`/reserva/${b.id}`}>Gestionar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

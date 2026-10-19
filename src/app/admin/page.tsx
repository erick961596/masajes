import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDay, fmtTime, money } from "@/lib/format";
import { localToUtc, shiftDate, todayStr, DATE_RE } from "@/lib/slots";
import { formatInTimeZone } from "date-fns-tz";
import { config } from "@/lib/config";
import { SP, str } from "@/lib/params";

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
  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const k = formatInTimeZone(b.start, config.tz, "yyyy-MM-dd");
    byDay.set(k, [...(byDay.get(k) ?? []), b]);
  }

  return (
    <>
      <div className="page-head">
        <h1>Agenda</h1>
        <p className="muted capitalize">
          {fmtDay(from)} – {fmtDay(shiftDate(to, -1))}
        </p>
      </div>
      <form method="get" className="row">
        <label className="field" style={{ margin: 0 }}>
          <span>Semana desde</span>
          <input type="date" name="desde" defaultValue={from} />
        </label>
        <button className="btn ghost">Ver</button>
        <Link className="btn ghost" href={`/admin?desde=${shiftDate(from, -7)}`}>
          ←
        </Link>
        <Link className="btn ghost" href={`/admin?desde=${to}`}>
          →
        </Link>
      </form>
      <div className="stats">
        <div className="stat">
          <div className="v">{confirmed.length}</div>
          <div className="k">Citas confirmadas</div>
        </div>
        <div className="stat">
          <div className="v">{money(confirmed.reduce((s, b) => s + b.priceCents, 0))}</div>
          <div className="k">Ingreso estimado</div>
        </div>
        <div className="stat">
          <div className="v">{bookings.length - confirmed.length}</div>
          <div className="k">Canceladas</div>
        </div>
      </div>
      {bookings.length === 0 && (
        <div className="card empty">
          <p>Sin citas esta semana.</p>
        </div>
      )}
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day} className="card">
          <h3 className="capitalize">{fmtDay(day)}</h3>
          <div className="table-wrap" style={{ padding: 0 }}>
            <table>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id} className={b.status === "CANCELLED" ? "inactive" : ""}>
                    <td style={{ width: 70 }}>
                      <strong>{fmtTime(b.start)}</strong>
                    </td>
                    <td>
                      {b.service.name}
                      <div className="muted">{money(b.priceCents)}</div>
                    </td>
                    <td>
                      {b.user.name}
                      <div className="muted">
                        {b.user.email}
                        {b.user.phone ? ` · ${b.user.phone}` : ""}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${b.status === "CANCELLED" ? "cancelled" : ""}`}>{b.status === "CANCELLED" ? "Cancelada" : "Confirmada"}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link className="btn ghost small" href={`/reserva/${b.id}`}>
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

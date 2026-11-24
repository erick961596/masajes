import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { colones, fmtDay } from "@/lib/format";
import { localToUtc, shiftDate, todayStr, DATE_RE } from "@/lib/slots";
import { SP, str } from "@/lib/params";
import { Notice } from "@/components/Notice";
import { BookingRow, rowInclude } from "@/components/BookingRow";
import { closePastBookings } from "./actions";

export default async function AdminAgenda({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const today = todayStr();
  const from = DATE_RE.test(str(sp.desde) || "") ? str(sp.desde)! : today;
  const to = shiftDate(from, 7);
  const now = new Date();
  const [bookings, todayList, pendingClose, blocks] = await Promise.all([
    db.booking.findMany({
      where: { start: { gte: localToUtc(from, 0), lt: localToUtc(to, 0) } },
      include: rowInclude,
      orderBy: { start: "asc" },
    }),
    db.booking.findMany({
      where: { start: { gte: localToUtc(today, 0), lt: localToUtc(shiftDate(today, 1), 0) }, status: { not: "CANCELLED" } },
      select: { start: true, priceCents: true, status: true },
    }),
    db.booking.count({ where: { status: "CONFIRMED", end: { lte: now } } }),
    db.blockedTime.findMany({ where: { start: { lt: localToUtc(to, 0) }, end: { gt: localToUtc(from, 0) } } }),
  ]);
  const active = bookings.filter((b) => b.status !== "CANCELLED");
  const nextToday = todayList.filter((b) => b.start > now && b.status === "CONFIRMED").length;

  const days = Array.from({ length: 7 }, (_, i) => shiftDate(from, i));
  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const k = formatInTimeZone(b.start, config.tz, "yyyy-MM-dd");
    byDay.set(k, [...(byDay.get(k) ?? []), b]);
  }
  const blockedDays = new Set(
    days.filter((d) => blocks.some((bl) => bl.start <= localToUtc(d, 9 * 60) && bl.end >= localToUtc(d, 18 * 60))),
  );

  return (
    <>
      <Notice error={str(sp.error)} ok={str(sp.ok)} />
      <div className="admin-head">
        <div>
          <h1>Agenda</h1>
          <p className="muted capitalize">
            {fmtDay(from)} – {fmtDay(shiftDate(to, -1))}
          </p>
        </div>
        <Link className="btn" href="/admin/reservas/nueva">
          + Nueva reserva
        </Link>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="k">Citas hoy</span>
          <span className="v">{todayList.length}</span>
          <span className="sub">{nextToday} por atender</span>
        </div>
        <div className="kpi">
          <span className="k">Ingreso de hoy</span>
          <span className="v">{colones(todayList.reduce((s, b) => s + b.priceCents, 0))}</span>
        </div>
        <div className="kpi">
          <span className="k">Citas en la semana</span>
          <span className="v">{active.length}</span>
          <span className="sub">{bookings.length - active.length} canceladas</span>
        </div>
        <div className="kpi">
          <span className="k">Ingreso de la semana</span>
          <span className="v">{colones(active.reduce((s, b) => s + b.priceCents, 0))}</span>
        </div>
      </div>

      {pendingClose > 0 && (
        <form action={closePastBookings} className="callout">
          <span>
            Tienes <strong>{pendingClose}</strong> cita(s) pasadas sin cerrar. Márcalas como realizadas para que cuenten en ganancias.
          </span>
          <button className="btn small">Marcar realizadas</button>
        </form>
      )}

      <form method="get" className="toolbar">
        <div className="btn-group">
          <Link className="btn ghost small" href={`/admin?desde=${shiftDate(from, -7)}`} aria-label="Semana anterior">
            ←
          </Link>
          <Link className="btn ghost small" href="/admin">
            Hoy
          </Link>
          <Link className="btn ghost small" href={`/admin?desde=${to}`} aria-label="Semana siguiente">
            →
          </Link>
        </div>
        <div className="row-actions">
          <input type="date" name="desde" defaultValue={from} aria-label="Semana desde" className="input-sm" />
          <button className="btn ghost small">Ir</button>
        </div>
      </form>

      <div className="agenda">
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const live = list.filter((b) => b.status !== "CANCELLED");
          return (
            <section key={d} className={`agenda-day card ${d === today ? "is-today" : ""} ${list.length === 0 ? "empty-day" : ""}`}>
              <header>
                <h3 className="capitalize">
                  {d === today ? "Hoy · " : ""}
                  {fmtDay(d)}
                </h3>
                <span className="agenda-day-meta">
                  {blockedDays.has(d) && <span className="badge cancelled">Bloqueado</span>}
                  {live.length ? (
                    <span>
                      {live.length} cita(s) · {colones(live.reduce((s, b) => s + b.priceCents, 0))}
                    </span>
                  ) : (
                    <span>Sin citas</span>
                  )}
                </span>
              </header>
              {list.map((b) => (
                <BookingRow key={b.id} b={b} />
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}

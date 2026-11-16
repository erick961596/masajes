import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { colones, colonesShort, DAYS } from "@/lib/format";
import { localToUtc, shiftDate, todayStr, DATE_RE } from "@/lib/slots";
import { SP, str } from "@/lib/params";

export const metadata = { title: "Ganancias" };

type Period = "semana" | "mes" | "anio" | "rango";
const PERIODS: [Period, string][] = [
  ["semana", "Semana"],
  ["mes", "Mes"],
  ["anio", "Año"],
  ["rango", "Rango"],
];

function dow(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}
function monthStart(date: string) {
  return `${date.slice(0, 8)}01`;
}
function addMonths(date: string, n: number) {
  const [y, m] = date.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** Rango [from, to) en fechas locales + rango anterior para comparar. */
function resolve(p: Period, ref: string, desde?: string, hasta?: string) {
  if (p === "semana") {
    const from = shiftDate(ref, -((dow(ref) + 6) % 7)); // lunes
    return { from, to: shiftDate(from, 7), prevFrom: shiftDate(from, -7), prev: shiftDate(from, -7), next: shiftDate(from, 7) };
  }
  if (p === "anio") {
    const from = `${ref.slice(0, 4)}-01-01`;
    const y = Number(ref.slice(0, 4));
    return { from, to: `${y + 1}-01-01`, prevFrom: `${y - 1}-01-01`, prev: `${y - 1}-01-01`, next: `${y + 1}-01-01` };
  }
  if (p === "rango" && desde && hasta && desde <= hasta) {
    const to = shiftDate(hasta, 1);
    const len = daysBetween(desde, to);
    return { from: desde, to, prevFrom: shiftDate(desde, -len), prev: "", next: "" };
  }
  const from = monthStart(ref);
  return { from, to: addMonths(from, 1), prevFrom: addMonths(from, -1), prev: addMonths(from, -1), next: addMonths(from, 1) };
}

export default async function EarningsDashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const today = todayStr();
  const period = (PERIODS.some(([v]) => v === str(sp.periodo)) ? str(sp.periodo) : "mes") as Period;
  const ref = DATE_RE.test(str(sp.fecha) || "") ? str(sp.fecha)! : today;
  const desde = DATE_RE.test(str(sp.desde) || "") ? str(sp.desde)! : "";
  const hasta = DATE_RE.test(str(sp.hasta) || "") ? str(sp.hasta)! : "";
  const r = resolve(period, ref, desde, hasta);
  const now = new Date();

  const [list, prevList] = await Promise.all([
    db.booking.findMany({
      where: { start: { gte: localToUtc(r.from, 0), lt: localToUtc(r.to, 0) } },
      include: { service: { select: { name: true } }, user: { select: { id: true, name: true } } },
      orderBy: { start: "asc" },
    }),
    db.booking.findMany({
      where: { start: { gte: localToUtc(r.prevFrom, 0), lt: localToUtc(r.from, 0) } },
      select: { start: true, status: true, priceCents: true },
    }),
  ]);

  const isEarned = (b: { status: string; start: Date }) => b.status === "COMPLETED" || (b.status === "CONFIRMED" && b.start <= now);
  const earned = list.filter(isEarned);
  const scheduled = list.filter((b) => b.status === "CONFIRMED" && b.start > now);
  const lost = list.filter((b) => b.status === "CANCELLED" || b.status === "NO_SHOW");
  const sum = (xs: { priceCents: number }[]) => xs.reduce((s, b) => s + b.priceCents, 0);
  const total = sum(earned);
  // Si el periodo está en curso, se compara contra el mismo tramo del periodo anterior (p. ej. 1–15 vs 1–15).
  const fromUtc = localToUtc(r.from, 0);
  const inProgress = now > fromUtc && now < localToUtc(r.to, 0);
  const prevCut = inProgress ? new Date(localToUtc(r.prevFrom, 0).getTime() + (now.getTime() - fromUtc.getTime())) : fromUtc;
  const prevTotal = sum(prevList.filter((b) => isEarned(b) && b.start < prevCut));
  const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const avg = earned.length ? total / earned.length : 0;

  // Serie temporal: por día, o por mes si el periodo es largo.
  const spanDays = daysBetween(r.from, r.to);
  const monthly = spanDays > 62;
  const keyOf = (d: Date) => formatInTimeZone(d, config.tz, monthly ? "yyyy-MM" : "yyyy-MM-dd");
  const buckets: { key: string; label: string; long: string; earned: number; scheduled: number; count: number }[] = [];
  if (monthly) {
    for (let m = monthStart(r.from); m < r.to; m = addMonths(m, 1)) {
      const d = new Date(`${m}T12:00:00Z`);
      buckets.push({
        key: m.slice(0, 7),
        label: formatInTimeZone(d, "UTC", "MMM", { locale: es }).replace(".", ""),
        long: formatInTimeZone(d, "UTC", "MMMM yyyy", { locale: es }),
        earned: 0,
        scheduled: 0,
        count: 0,
      });
    }
  } else {
    for (let d = r.from; d < r.to; d = shiftDate(d, 1)) {
      const dt = new Date(`${d}T12:00:00Z`);
      buckets.push({
        key: d,
        label: spanDays <= 7 ? formatInTimeZone(dt, "UTC", "EEE d", { locale: es }).replace(".", "") : formatInTimeZone(dt, "UTC", "d"),
        long: formatInTimeZone(dt, "UTC", "EEEE d 'de' MMMM", { locale: es }),
        earned: 0,
        scheduled: 0,
        count: 0,
      });
    }
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const b of earned) {
    const k = byKey.get(keyOf(b.start));
    if (k) (k.earned += b.priceCents), k.count++;
  }
  for (const b of scheduled) {
    const k = byKey.get(keyOf(b.start));
    if (k) (k.scheduled += b.priceCents), k.count++;
  }
  const maxBar = Math.max(1, ...buckets.map((b) => b.earned + b.scheduled));
  const ticks = niceTicks(maxBar);
  const top = ticks[ticks.length - 1];
  const labelEvery = buckets.length > 16 ? Math.ceil(buckets.length / 8) : 1;

  const group = (key: (b: (typeof earned)[number]) => string) => {
    const m = new Map<string, { name: string; cents: number; count: number }>();
    for (const b of earned) {
      const k = key(b);
      const g = m.get(k) ?? { name: k, cents: 0, count: 0 };
      g.cents += b.priceCents;
      g.count++;
      m.set(k, g);
    }
    return [...m.values()].sort((a, b) => b.cents - a.cents);
  };
  const byService = group((b) => b.service.name);
  const byPayment = group((b) => b.paymentMethod || "Sin registrar");
  const byClient = group((b) => b.user.name).slice(0, 5);
  const byWeekday = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const xs = earned.filter((b) => Number(formatInTimeZone(b.start, config.tz, "i")) % 7 === d);
    return { name: DAYS[d], cents: sum(xs), count: xs.length };
  }).filter((d) => d.count > 0);

  const title =
    period === "semana"
      ? `Semana del ${formatInTimeZone(new Date(`${r.from}T12:00:00Z`), "UTC", "d 'de' MMMM", { locale: es })}`
      : period === "anio"
        ? r.from.slice(0, 4)
        : period === "rango" && desde && hasta
          ? `${desde} → ${hasta}`
          : formatInTimeZone(new Date(`${r.from}T12:00:00Z`), "UTC", "MMMM yyyy", { locale: es });
  const href = (patch: Record<string, string>) => `/admin/ganancias?${new URLSearchParams({ periodo: period, ...patch })}`;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Ganancias</h1>
          <p className="muted capitalize">{title}</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="seg">
          {PERIODS.map(([v, l]) => (
            <Link key={v} href={`/admin/ganancias?periodo=${v}`} className={v === period ? "active" : ""}>
              {l}
            </Link>
          ))}
        </div>
        {period !== "rango" ? (
          <div className="row-actions">
            <Link className="btn ghost small" href={href({ fecha: r.prev })} aria-label="Periodo anterior">
              ←
            </Link>
            <Link className="btn ghost small" href={href({})}>
              Actual
            </Link>
            <Link className="btn ghost small" href={href({ fecha: r.next })} aria-label="Periodo siguiente">
              →
            </Link>
          </div>
        ) : (
          <form method="get" className="row-actions">
            <input type="hidden" name="periodo" value="rango" />
            <input type="date" name="desde" defaultValue={desde || shiftDate(today, -30)} className="input-sm" aria-label="Desde" />
            <input type="date" name="hasta" defaultValue={hasta || today} className="input-sm" aria-label="Hasta" />
            <button className="btn small">Ver</button>
          </form>
        )}
      </div>

      <div className="kpis">
        <div className="kpi kpi-hero">
          <span className="k">Ingresos del periodo</span>
          <span className="v">{colones(total)}</span>
          <span className="sub">
            {delta === null ? (
              "Sin datos del periodo anterior"
            ) : (
              <>
                <span className={delta >= 0 ? "up" : "down"}>
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
                </span>{" "}
                vs. {inProgress ? "mismo punto del periodo anterior" : "periodo anterior"} ({colones(prevTotal)})
              </>
            )}
          </span>
        </div>
        <div className="kpi">
          <span className="k">Por cobrar (agendado)</span>
          <span className="v">{colones(sum(scheduled))}</span>
          <span className="sub">{scheduled.length} cita(s) próximas</span>
        </div>
        <div className="kpi">
          <span className="k">Citas atendidas</span>
          <span className="v">{earned.length}</span>
          <span className="sub">Ticket promedio {colones(avg)}</span>
        </div>
        <div className="kpi">
          <span className="k">Perdido</span>
          <span className="v">{colones(sum(lost))}</span>
          <span className="sub">
            {lost.filter((b) => b.status === "CANCELLED").length} canceladas · {lost.filter((b) => b.status === "NO_SHOW").length} no asistieron
          </span>
        </div>
      </div>

      <section className="card chart-card">
        <header className="chart-head">
          <h3>{monthly ? "Ingresos por mes" : "Ingresos por día"}</h3>
          <div className="legend">
            <span>
              <i className="sw sw-earned" /> Cobrado
            </span>
            <span>
              <i className="sw sw-sched" /> Agendado
            </span>
          </div>
        </header>
        <div className="bars" style={{ ["--n" as string]: buckets.length }}>
          <div className="bars-grid" aria-hidden>
            {ticks
              .slice()
              .reverse()
              .map((t) => (
                <div key={t} className="gridline">
                  <span>{colonesShort(t)}</span>
                </div>
              ))}
          </div>
          <div className="bars-plot">
            {buckets.map((b, i) => {
              const tip = `${b.long}: ${colones(b.earned)} cobrado${b.scheduled ? ` + ${colones(b.scheduled)} agendado` : ""} · ${b.count} cita(s)`;
              return (
                <div key={b.key} className={`bar-col ${b.key === today || b.key === today.slice(0, 7) ? "is-now" : ""}`} tabIndex={0} aria-label={tip} data-tip={tip}>
                  <div className="bar-stack">
                    {b.scheduled > 0 && <div className="bar sched" style={{ height: `${(b.scheduled / top) * 100}%` }} />}
                    {b.earned > 0 && <div className="bar earned" style={{ height: `${(b.earned / top) * 100}%` }} />}
                  </div>
                  <span className="bar-x capitalize">{i % labelEvery === 0 ? b.label : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
        <details className="table-toggle">
          <summary>Ver como tabla</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{monthly ? "Mes" : "Día"}</th>
                  <th>Citas</th>
                  <th>Cobrado</th>
                  <th>Agendado</th>
                </tr>
              </thead>
              <tbody>
                {buckets
                  .filter((b) => b.count)
                  .map((b) => (
                    <tr key={b.key}>
                      <td className="capitalize">{b.long}</td>
                      <td>{b.count}</td>
                      <td>{colones(b.earned)}</td>
                      <td>{colones(b.scheduled)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <div className="dash-grid">
        <RankCard title="Por servicio" rows={byService} total={total} empty="Aún no hay servicios cobrados en este periodo." />
        <RankCard title="Por método de pago" rows={byPayment} total={total} empty="Registra el método de pago en cada reserva para verlo aquí." />
        <RankCard title="Días más fuertes" rows={byWeekday} total={total} keepOrder empty="Sin datos." />
        <RankCard title="Mejores clientes" rows={byClient} total={total} empty="Sin datos." />
      </div>
    </>
  );
}

function RankCard({
  title,
  rows,
  total,
  empty,
  keepOrder,
}: {
  title: string;
  rows: { name: string; cents: number; count: number }[];
  total: number;
  empty: string;
  keepOrder?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.cents));
  const shown = keepOrder ? rows : rows.filter((r) => r.cents > 0 || r.count > 0);
  return (
    <section className="card rank-card">
      <h3>{title}</h3>
      {total === 0 || shown.length === 0 ? (
        <p className="muted small">{empty}</p>
      ) : (
        <ul className="rank">
          {shown.map((r) => (
            <li key={r.name} title={`${r.name}: ${colones(r.cents)} · ${r.count} cita(s)`}>
              <div className="rank-top">
                <span className="rank-name">{r.name}</span>
                <span className="rank-val">
                  {colones(r.cents)} <span className="muted">· {total ? Math.round((r.cents / total) * 100) : 0}%</span>
                </span>
              </div>
              <div className="rank-track">
                <div className="rank-fill" style={{ width: `${(r.cents / max) * 100}%` }} />
              </div>
              <span className="muted small">{r.count} cita(s)</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Marcas de eje "redondas" en céntimos (₡5 000, ₡10 000…). */
function niceTicks(maxCents: number) {
  const max = maxCents / 100;
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const n = Math.max(1, Math.ceil(max / step));
  return Array.from({ length: n + 1 }, (_, i) => i * step * 100);
}

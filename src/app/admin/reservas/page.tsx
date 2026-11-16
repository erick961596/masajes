import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { colones } from "@/lib/format";
import { localToUtc, shiftDate, DATE_RE } from "@/lib/slots";
import { SP, str } from "@/lib/params";
import { Notice } from "@/components/Notice";
import { BookingRow, rowInclude } from "@/components/BookingRow";

export const metadata = { title: "Reservas" };

const PAGE = 40;
const VIEWS = [
  ["proximas", "Próximas"],
  ["pasadas", "Pasadas"],
  ["todas", "Todas"],
] as const;
const STATUSES = [
  ["", "Todos los estados"],
  ["CONFIRMED", "Confirmadas"],
  ["por-cerrar", "Por cerrar"],
  ["COMPLETED", "Realizadas"],
  ["NO_SHOW", "No asistió"],
  ["CANCELLED", "Canceladas"],
] as const;

export default async function ReservationsAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const view = VIEWS.some(([v]) => v === str(sp.vista)) ? str(sp.vista)! : "proximas";
  const q = (str(sp.q) || "").trim();
  const status = str(sp.estado) || "";
  const serviceId = str(sp.servicio) || "";
  const desde = DATE_RE.test(str(sp.desde) || "") ? str(sp.desde)! : "";
  const hasta = DATE_RE.test(str(sp.hasta) || "") ? str(sp.hasta)! : "";
  const page = Math.max(1, Number(str(sp.pagina)) || 1);
  const now = new Date();

  const and: Prisma.BookingWhereInput[] = [];
  if (view === "proximas") and.push({ end: { gt: now } });
  if (view === "pasadas") and.push({ end: { lte: now } });
  if (status === "por-cerrar") and.push({ status: "CONFIRMED", end: { lte: now } });
  else if (["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"].includes(status)) and.push({ status: status as "CONFIRMED" });
  if (/^[0-9a-f-]{36}$/i.test(serviceId)) and.push({ serviceId });
  if (desde) and.push({ start: { gte: localToUtc(desde, 0) } });
  if (hasta) and.push({ start: { lt: localToUtc(shiftDate(hasta, 1), 0) } });
  if (q) {
    const or: Prisma.BookingWhereInput[] = [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q } } },
      { service: { name: { contains: q, mode: "insensitive" } } },
    ];
    if (/^[0-9a-f-]{36}$/i.test(q)) or.push({ id: q });
    and.push({ OR: or });
  }
  const where: Prisma.BookingWhereInput = { AND: and };

  const [bookings, total, sum, services] = await Promise.all([
    db.booking.findMany({
      where,
      include: rowInclude,
      orderBy: { start: view === "proximas" ? "asc" : "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
    }),
    db.booking.count({ where }),
    db.booking.aggregate({ where: { AND: [...and, { status: { not: "CANCELLED" } }] }, _sum: { priceCents: true } }),
    db.service.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ vista: view, q, estado: status, servicio: serviceId, desde, hasta, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/reservas?${p}`;
  };
  const filtered = q || status || serviceId || desde || hasta;

  return (
    <>
      <Notice error={str(sp.error)} ok={str(sp.ok)} />
      <div className="admin-head">
        <div>
          <h1>Reservas</h1>
          <p className="muted">
            {total} reserva(s) · {colones(sum._sum.priceCents ?? 0)} sin contar canceladas
          </p>
        </div>
        <Link className="btn" href="/admin/reservas/nueva">
          + Nueva reserva
        </Link>
      </div>

      <div className="seg" role="tablist">
        {VIEWS.map(([v, label]) => (
          <Link key={v} href={qs({ vista: v, pagina: "" })} className={v === view ? "active" : ""} role="tab" aria-selected={v === view}>
            {label}
          </Link>
        ))}
      </div>

      <form method="get" className="card filters">
        <input type="hidden" name="vista" value={view} />
        <label className="field grow">
          <span>Buscar</span>
          <input name="q" defaultValue={q} placeholder="Cliente, correo, teléfono, servicio o folio" />
        </label>
        <label className="field">
          <span>Estado</span>
          <select name="estado" defaultValue={status}>
            {STATUSES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Servicio</span>
          <select name="servicio" defaultValue={serviceId}>
            <option value="">Todos</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Desde</span>
          <input type="date" name="desde" defaultValue={desde} />
        </label>
        <label className="field">
          <span>Hasta</span>
          <input type="date" name="hasta" defaultValue={hasta} />
        </label>
        <div className="filters-actions">
          <button className="btn">Filtrar</button>
          {filtered && (
            <Link className="btn ghost" href={`/admin/reservas?vista=${view}`}>
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {bookings.length === 0 ? (
        <div className="card empty">
          <p>No hay reservas con estos filtros.</p>
          <Link className="btn ghost" href="/admin/reservas/nueva">
            Crear una reserva
          </Link>
        </div>
      ) : (
        <div className="card list-card">
          {bookings.map((b) => (
            <BookingRow key={b.id} b={b} showDate />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="pager">
          {page > 1 ? (
            <Link className="btn ghost small" href={qs({ pagina: String(page - 1) })}>
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="muted">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link className="btn ghost small" href={qs({ pagina: String(page + 1) })}>
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

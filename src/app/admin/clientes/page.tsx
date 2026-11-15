import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { colones } from "@/lib/format";
import { SP, str } from "@/lib/params";

export const metadata = { title: "Clientes" };

export default async function ClientsAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (str(sp.q) || "").trim();
  const now = new Date();
  const users = await db.user.findMany({
    where: {
      role: "CLIENT",
      ...(q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
        : {}),
    },
    include: { bookings: { select: { start: true, status: true, priceCents: true } } },
    orderBy: { name: "asc" },
    take: 200,
  });
  const rows = users
    .map((u) => {
      const done = u.bookings.filter((b) => b.status === "COMPLETED" || (b.status === "CONFIRMED" && b.start <= now));
      const next = u.bookings.filter((b) => b.status === "CONFIRMED" && b.start > now).sort((a, b) => +a.start - +b.start)[0];
      const last = done.sort((a, b) => +b.start - +a.start)[0];
      return { u, visits: done.length, spent: done.reduce((s, b) => s + b.priceCents, 0), next, last };
    })
    .sort((a, b) => b.spent - a.spent || a.u.name.localeCompare(b.u.name));

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Clientes</h1>
          <p className="muted">{rows.length} cliente(s). Ordenados por lo que han invertido.</p>
        </div>
        <Link className="btn" href="/admin/reservas/nueva">
          + Nueva reserva
        </Link>
      </div>
      <form method="get" className="toolbar">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre, correo o teléfono" className="grow" />
        <button className="btn ghost small">Buscar</button>
      </form>
      <div className="card list-card">
        {rows.length === 0 && <p className="muted empty">No hay clientes.</p>}
        {rows.map(({ u, visits, spent, next, last }) => (
          <div key={u.id} className="client-row">
            <div className="avatar" aria-hidden>
              {u.name.trim().charAt(0).toUpperCase()}
            </div>
            <div className="client-main">
              <strong>
                {u.name} {!u.passwordHash && <span className="badge past">Sin cuenta</span>}
              </strong>
              <span className="muted small">
                {u.email}
                {u.phone ? ` · ${u.phone}` : ""}
              </span>
              <span className="muted small">
                {visits} visita(s)
                {last ? ` · última ${formatInTimeZone(last.start, config.tz, "dd/MM/yy")}` : ""}
                {next ? ` · próxima ${formatInTimeZone(next.start, config.tz, "dd/MM HH:mm")}` : ""}
              </span>
            </div>
            <div className="client-side">
              <span className="bk-price">{colones(spent)}</span>
              <div className="row-actions">
                <Link className="btn ghost small" href={`/admin/reservas?vista=todas&q=${encodeURIComponent(u.email)}`}>
                  Citas
                </Link>
                <Link className="btn small" href={`/admin/reservas/nueva?cliente=${u.id}`}>
                  Agendar
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

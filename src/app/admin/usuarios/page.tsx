import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { SP, str } from "@/lib/params";
import { NewUserForm, UserActions } from "@/components/UserAdmin";

export const metadata = { title: "Usuarios" };

export default async function UsersAdmin({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const rol = str(sp.rol) === "clientes" ? "CLIENT" : str(sp.rol) === "todos" ? undefined : "ADMIN";
  const q = (str(sp.q) || "").trim();
  const [users, counts] = await Promise.all([
    db.user.findMany({
      where: {
        ...(rol ? { role: rol } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, passwordHash: true, createdAt: true, _count: { select: { bookings: true } } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 300,
    }),
    db.user.groupBy({ by: ["role"], _count: true }),
  ]);
  const n = (r: string) => counts.find((c) => c.role === r)?._count ?? 0;
  const tab = (key: string, label: string, count: number) => {
    const active = (key === "admins" && rol === "ADMIN") || (key === "clientes" && rol === "CLIENT") || (key === "todos" && !rol);
    return (
      <a href={`/admin/usuarios?rol=${key}`} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
        {label} <span className="count">{count}</span>
      </a>
    );
  };

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Usuarios</h1>
          <p className="muted">Los admin entran a este panel. Los clientes solo ven sus citas.</p>
        </div>
      </div>

      <NewUserForm />

      <div className="toolbar">
        <nav className="tabs" aria-label="Filtrar por rol">
          {tab("admins", "Admins", n("ADMIN"))}
          {tab("clientes", "Clientes", n("CLIENT"))}
          {tab("todos", "Todos", n("ADMIN") + n("CLIENT"))}
        </nav>
        <form method="get" className="toolbar-search">
          <input type="hidden" name="rol" value={rol === "ADMIN" ? "admins" : rol === "CLIENT" ? "clientes" : "todos"} />
          <input name="q" defaultValue={q} placeholder="Buscar nombre o correo" aria-label="Buscar" />
        </form>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Acceso</th>
              <th className="num">Citas</th>
              <th>Alta</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="muted empty">
                  No hay usuarios con ese filtro.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Nombre">
                  <strong>{u.name}</strong>
                  {u.id === me.id && <span className="muted small"> (tú)</span>}
                  {u.phone && <div className="muted small">{u.phone}</div>}
                </td>
                <td data-label="Correo">{u.email}</td>
                <td data-label="Rol">
                  <span className={`tag ${u.role === "ADMIN" ? "tag-admin" : ""}`}>{u.role === "ADMIN" ? "Admin" : "Cliente"}</span>
                </td>
                <td data-label="Acceso">{u.passwordHash ? <span className="muted">Con contraseña</span> : <span className="tag tag-warn">Sin contraseña</span>}</td>
                <td data-label="Citas" className="num">
                  {u._count.bookings}
                </td>
                <td data-label="Alta" className="muted">
                  {formatInTimeZone(u.createdAt, config.tz, "dd/MM/yy")}
                </td>
                <td className="actions">
                  <UserActions user={{ id: u.id, name: u.name, role: u.role, bookings: u._count.bookings }} isMe={u.id === me.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

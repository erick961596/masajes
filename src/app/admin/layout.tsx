import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <div className="subnav">
        <Link className="btn secondary" href="/admin">Agenda</Link>
        <Link className="btn secondary" href="/admin/servicios">Servicios y precios</Link>
        <Link className="btn secondary" href="/admin/horarios">Horarios</Link>
        <Link className="btn secondary" href="/admin/bloqueos">Bloqueos</Link>
      </div>
      {children}
    </>
  );
}

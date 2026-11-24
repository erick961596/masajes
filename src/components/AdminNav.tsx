"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: [string, string, string][] = [
  ["/admin", "Agenda", "📅"],
  ["/admin/reservas", "Reservas", "🗂️"],
  ["/admin/ganancias", "Ganancias", "📈"],
  ["/admin/clientes", "Clientes", "👥"],
  ["/admin/servicios", "Servicios", "💆"],
  ["/admin/horarios", "Horarios", "🕘"],
  ["/admin/bloqueos", "Bloqueos", "⛔"],
  ["/admin/usuarios", "Usuarios", "🔑"],
  ["/admin/configuracion", "Configuración", "⚙️"],
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Administración">
      {LINKS.map(([href, label, icon]) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <span aria-hidden>{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

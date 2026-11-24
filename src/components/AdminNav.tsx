"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: [string, [string, string][]][] = [
  [
    "Día a día",
    [
      ["/admin", "Agenda"],
      ["/admin/reservas", "Reservas"],
      ["/admin/clientes", "Clientes"],
    ],
  ],
  [
    "Negocio",
    [
      ["/admin/ganancias", "Ganancias"],
      ["/admin/servicios", "Servicios y precios"],
      ["/admin/horarios", "Horario"],
      ["/admin/bloqueos", "Bloqueos"],
    ],
  ],
  [
    "Sistema",
    [
      ["/admin/usuarios", "Usuarios"],
      ["/admin/configuracion", "Configuración"],
    ],
  ],
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Administración">
      {GROUPS.map(([group, links]) => (
        <div key={group} className="nav-group">
          <span className="nav-group-label">{group}</span>
          {links.map(([href, label]) => {
            const active = href === "/admin" ? path === href : path.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

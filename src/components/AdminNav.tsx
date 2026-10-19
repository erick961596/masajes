"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/admin", "Agenda"],
  ["/admin/servicios", "Servicios y precios"],
  ["/admin/horarios", "Horarios"],
  ["/admin/bloqueos", "Bloqueos"],
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="subnav">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={path === href ? "active" : ""}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

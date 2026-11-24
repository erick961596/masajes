"use client";

import { useEffect, useState } from "react";
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

/** Accesos de la barra inferior en celular. El resto va en el menú. */
const TABS: [string, string, string][] = [
  ["/admin/reservas", "Reservas", "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 13h3M8 17h6"],
  ["/admin/servicios", "Servicios", "M4 6h16M4 12h16M4 18h10"],
  ["/admin/horarios", "Horario", "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"],
  ["/admin/bloqueos", "Bloqueos", "M5.6 5.6l12.8 12.8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"],
];

const isActive = (path: string, href: string) => (href === "/admin" ? path === href : path.startsWith(href));

function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function Links({ path, onPick }: { path: string; onPick?: () => void }) {
  return (
    <>
      {GROUPS.map(([group, links]) => (
        <div key={group} className="nav-group">
          <span className="nav-group-label">{group}</span>
          {links.map(([href, label]) => {
            const active = isActive(path, href);
            return (
              <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={onPick}>
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

export function AdminNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const inTabs = TABS.some(([href]) => isActive(path, href));

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Escritorio: barra lateral */}
      <nav className="admin-nav" aria-label="Administración">
        <Links path={path} />
      </nav>

      {/* Celular: barra inferior tipo app + menú */}
      <nav className="admin-tabbar" aria-label="Accesos rápidos">
        {TABS.map(([href, label, d]) => {
          const active = isActive(path, href);
          return (
            <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
              <Icon d={d} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button type="button" className={!inTabs || open ? "active" : ""} aria-expanded={open} aria-controls="admin-drawer" onClick={() => setOpen((o) => !o)}>
          <Icon d="M4 6h16M4 12h16M4 18h16" />
          <span>Menú</span>
        </button>
      </nav>

      {open && <div className="drawer-backdrop" onClick={() => setOpen(false)} aria-hidden />}
      <div id="admin-drawer" className={`admin-drawer ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Menú de administración" hidden={!open}>
        <div className="drawer-head">
          <strong>Menú</strong>
          <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>
            Cerrar
          </button>
        </div>
        <Links path={path} onPick={() => setOpen(false)} />
      </div>
    </>
  );
}

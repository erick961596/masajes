"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { swal, toast } from "@/lib/swal";
import { createUser, deleteUser, setUserPassword, setUserRole } from "@/app/admin/actions";

type R = { ok: true; message: string } | { ok: false; error: string };

function report(r: R) {
  if (r.ok) toast.fire({ icon: "success", titleText: r.message });
  else swal.fire({ icon: "error", title: "No se pudo", text: r.error, confirmButtonText: "Entendido" });
  return r.ok;
}

export function NewUserForm() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "CLIENT">("ADMIN");
  const [pending, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

  if (!open) {
    return (
      <div className="toolbar">
        <button className="btn" onClick={() => setOpen(true)}>
          + Nuevo usuario
        </button>
      </div>
    );
  }
  return (
    <form
      ref={form}
      className="panel form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        start(async () => {
          const r = await createUser({ name: f.name, email: f.email, phone: f.phone, password: f.password, role });
          if (report(r)) {
            form.current?.reset();
            setOpen(false);
            router.refresh();
          }
        });
      }}
    >
      <div className="panel-head">
        <h2>Nuevo usuario</h2>
        <div className="seg" role="radiogroup" aria-label="Rol">
          {(["ADMIN", "CLIENT"] as const).map((r) => (
            <button key={r} type="button" role="radio" aria-checked={role === r} className={role === r ? "on" : ""} onClick={() => setRole(r)}>
              {r === "ADMIN" ? "Admin" : "Cliente"}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Nombre</span>
        <input name="name" required minLength={2} autoComplete="off" />
      </label>
      <label className="field">
        <span>Correo</span>
        <input name="email" type="email" required autoComplete="off" />
      </label>
      <label className="field">
        <span>Teléfono</span>
        <input name="phone" inputMode="tel" placeholder="Opcional" />
      </label>
      <label className="field">
        <span>Contraseña</span>
        <input name="password" type="text" minLength={8} autoComplete="new-password" placeholder={role === "ADMIN" ? "Mín. 8 caracteres" : "Opcional"} required={role === "ADMIN"} />
      </label>
      <p className="muted small span-all">
        {role === "ADMIN"
          ? "Podrá entrar al panel completo (agenda, reservas, ganancias, configuración). Pásale la contraseña por un medio seguro."
          : "Sin contraseña, el cliente la crea al registrarse con este mismo correo y ve sus citas."}
      </p>
      <div className="form-actions span-all">
        <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button className="btn" disabled={pending}>
          {pending ? "Creando…" : role === "ADMIN" ? "Crear admin" : "Crear cliente"}
        </button>
      </div>
    </form>
  );
}

export function UserActions({ user, isMe }: { user: { id: string; name: string; role: "ADMIN" | "CLIENT"; bookings: number }; isMe: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<R>) =>
    start(async () => {
      if (report(await fn())) router.refresh();
    });

  return (
    <div className="row-actions">
      {!isMe && (
        <button
          className="btn ghost small"
          disabled={pending}
          onClick={async () => {
            const toAdmin = user.role !== "ADMIN";
            const c = await swal.fire({
              icon: "question",
              title: toAdmin ? `¿Hacer admin a ${user.name}?` : `¿Quitar admin a ${user.name}?`,
              text: toAdmin ? "Tendrá acceso a todo el panel." : "Quedará como cliente y ya no verá el panel.",
              showCancelButton: true,
              confirmButtonText: toAdmin ? "Hacer admin" : "Quitar admin",
              cancelButtonText: "No",
            });
            if (c.isConfirmed) run(() => setUserRole(user.id, toAdmin ? "ADMIN" : "CLIENT"));
          }}
        >
          {user.role === "ADMIN" ? "Quitar admin" : "Hacer admin"}
        </button>
      )}
      <button
        className="btn ghost small"
        disabled={pending}
        onClick={async () => {
          const r = await swal.fire({
            title: `Contraseña de ${user.name}`,
            input: "text",
            inputAttributes: { minlength: "8", autocomplete: "new-password" },
            inputPlaceholder: "Mínimo 8 caracteres",
            showCancelButton: true,
            confirmButtonText: "Guardar",
            cancelButtonText: "Cancelar",
            inputValidator: (v) => (v && v.length >= 8 ? null : "Mínimo 8 caracteres"),
          });
          if (r.isConfirmed) run(() => setUserPassword(user.id, String(r.value)));
        }}
      >
        Contraseña
      </button>
      {!isMe && user.bookings === 0 && (
        <button
          className="btn ghost small danger-text"
          disabled={pending}
          onClick={async () => {
            const c = await swal.fire({ icon: "warning", title: `¿Borrar a ${user.name}?`, text: "No tiene citas. Se borra para siempre.", showCancelButton: true, confirmButtonText: "Borrar", cancelButtonText: "No" });
            if (c.isConfirmed) run(() => deleteUser(user.id));
          }}
        >
          Borrar
        </button>
      )}
    </div>
  );
}

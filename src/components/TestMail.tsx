"use client";

import { useState, useTransition } from "react";
import { swal } from "@/lib/swal";
import { sendTestMail } from "@/app/admin/actions";

export function TestMail({ defaultTo }: { defaultTo: string }) {
  const [to, setTo] = useState(defaultTo);
  const [pending, start] = useTransition();
  return (
    <form
      className="toolbar"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await sendTestMail(to);
          if (!r.ok) return void swal.fire({ icon: "error", title: "No se envió", text: r.error, confirmButtonText: "Entendido" });
          swal.fire({
            icon: "success",
            title: "Correo enviado",
            html: r.previewUrl ? `Míralo aquí: <a href="${r.previewUrl}" target="_blank" rel="noreferrer">abrir vista previa</a>` : "Revisa la bandeja de entrada.",
            confirmButtonText: "Listo",
          });
        });
      }}
    >
      <input type="email" value={to} onChange={(e) => setTo(e.target.value)} required className="grow" aria-label="Enviar a" />
      <button className="btn" disabled={pending}>
        {pending ? "Enviando…" : "Enviar correo de prueba"}
      </button>
    </form>
  );
}

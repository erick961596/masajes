"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { swal, toast } from "@/lib/swal";
import { saveNotifyEmails, sendTestToTeam } from "@/app/admin/actions";

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function NotifyEmailsForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const items = useMemo(
    () =>
      value
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [value],
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveNotifyEmails(value);
          if (!r.ok) return void swal.fire({ icon: "error", title: "Correos inválidos", text: r.error, confirmButtonText: "Entendido" });
          toast.fire({ icon: "success", titleText: r.message });
          router.refresh();
        });
      }}
    >
      <label className="field">
        <span>Enviar copia a</span>
        <textarea rows={2} value={value} onChange={(e) => setValue(e.target.value)} placeholder="ana@anispa.com, recepcion@anispa.com" spellCheck={false} />
      </label>
      <div className="chips-line" aria-live="polite">
        {items.length === 0 ? (
          <span className="muted small">Nadie del equipo recibirá copia.</span>
        ) : (
          items.map((e, i) => (
            <span key={`${e}-${i}`} className={`tag ${EMAIL.test(e) ? "" : "tag-bad"}`} title={EMAIL.test(e) ? undefined : "Correo inválido"}>
              {e}
            </span>
          ))
        )}
      </div>
      <div className="form-actions">
        <button
          type="button"
          className="btn ghost"
          disabled={pending || value !== initial || items.length === 0}
          title={value !== initial ? "Guarda primero los cambios" : undefined}
          onClick={() =>
            start(async () => {
              const res = await sendTestToTeam();
              const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
              const list = res
                .map((r) => `<li>${r.ok ? "✓" : "✗"} <strong>${esc(r.to)}</strong>${r.ok ? (r.previewUrl ? ` · <a href="${esc(r.previewUrl)}" target="_blank" rel="noreferrer">ver</a>` : "") : `<br><small>${esc(r.error || "Falló")}</small>`}</li>`)
                .join("");
              const bad = res.filter((r) => !r.ok).length;
              swal.fire({
                icon: bad ? "warning" : "success",
                title: bad ? `${bad} de ${res.length} no se enviaron` : `Enviado a ${res.length} correo(s)`,
                html: `<ul class="swal-list">${list}</ul>${bad ? '<p class="swal-note small">Si el error menciona el dominio o “demo”, el proveedor de correo está bloqueando ese destinatario.</p>' : '<p class="swal-note small">Si alguno no llega, revisa la carpeta de spam.</p>'}`,
                confirmButtonText: "Listo",
              });
              router.refresh();
            })
          }
        >
          Probar con estos correos
        </button>
        <button className="btn" disabled={pending || value === initial}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

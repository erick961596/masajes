"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { swal, toast } from "@/lib/swal";
import { checkBlockConflicts, createBlock, type BlockInput } from "@/app/admin/actions";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Formulario de bloqueo: antes de guardar revisa si hay citas en ese rango y pregunta qué hacer con ellas. */
export function BlockForm({ today }: { today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [allDay, setAllDay] = useState(true);
  const [v, setV] = useState<BlockInput>({ startDate: today, endDate: "", startTime: "", endTime: "", reason: "" });

  function submit() {
    const input: BlockInput = allDay ? { ...v, startTime: "", endTime: "" } : v;
    start(async () => {
      const check = await checkBlockConflicts(input);
      if (!check.ok) {
        swal.fire({ icon: "error", title: "Revisa el bloqueo", text: check.error, confirmButtonText: "Entendido" });
        return;
      }
      let cancelBookings = false;
      if (check.conflicts.length) {
        const n = check.conflicts.length;
        const r = await swal.fire({
          icon: "warning",
          title: n === 1 ? "Ya tienes 1 cita en ese horario" : `Ya tienes ${n} citas en ese horario`,
          html:
            `<ul class="swal-list">${check.conflicts
              .map((c) => `<li><strong>${esc(c.when)}</strong><br>${esc(c.service)} · ${esc(c.client)}</li>`)
              .join("")}</ul>` + `<p class="swal-note">¿Qué hacemos con ${n === 1 ? "esa cita" : "esas citas"}?</p>`,
          showDenyButton: true,
          showCancelButton: true,
          confirmButtonText: "Bloquear y mantener citas",
          denyButtonText: "Bloquear y cancelarlas",
          cancelButtonText: "Volver",
        });
        if (r.isDismissed) return;
        cancelBookings = r.isDenied;
      }
      const res = await createBlock({ ...input, cancelBookings, notify: true });
      if (!res.ok) {
        swal.fire({ icon: "error", title: "No se pudo bloquear", text: res.error, confirmButtonText: "Entendido" });
        return;
      }
      toast.fire({
        icon: "success",
        titleText: "Bloqueo agregado",
        text: res.cancelled ? `${res.cancelled} cita(s) canceladas y avisadas por correo` : undefined,
      });
      setV({ startDate: today, endDate: "", startTime: "", endTime: "", reason: "" });
      router.refresh();
    });
  }

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="section-title">
        <h3>Nuevo bloqueo</h3>
      </div>
      <div className="seg seg-sm" role="radiogroup">
        <button type="button" className={allDay ? "active" : ""} onClick={() => setAllDay(true)} aria-pressed={allDay}>
          Días completos
        </button>
        <button type="button" className={!allDay ? "active" : ""} onClick={() => setAllDay(false)} aria-pressed={!allDay}>
          Unas horas
        </button>
      </div>
      <div className="form-cols">
        <label className="field">
          <span>{allDay ? "Desde el día" : "Día"}</span>
          <input type="date" value={v.startDate} onChange={(e) => setV({ ...v, startDate: e.target.value })} required />
        </label>
        {allDay ? (
          <label className="field">
            <span>Hasta el día (opcional)</span>
            <input type="date" value={v.endDate} min={v.startDate} onChange={(e) => setV({ ...v, endDate: e.target.value })} />
          </label>
        ) : (
          <div className="form-cols">
            <label className="field">
              <span>Desde</span>
              <input type="time" value={v.startTime} onChange={(e) => setV({ ...v, startTime: e.target.value })} required />
            </label>
            <label className="field">
              <span>Hasta</span>
              <input type="time" value={v.endTime} onChange={(e) => setV({ ...v, endTime: e.target.value })} required />
            </label>
          </div>
        )}
      </div>
      <label className="field">
        <span>Motivo</span>
        <input value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} placeholder="Vacaciones, curso, cita médica…" />
      </label>
      <button className="btn" disabled={pending}>
        {pending ? "Revisando…" : "Agregar bloqueo"}
      </button>
    </form>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { swal, toast } from "@/lib/swal";
import { saveAdminBooking, type AdminBookingInput } from "@/app/admin/actions";

type Client = { id: string; name: string; email: string; phone: string | null };
type Service = { id: string; name: string; durationMin: number; priceCents: number; active: boolean };
type Status = "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";

export type BookingInitial = {
  id: string;
  userId: string;
  serviceId: string;
  date: string;
  time: string;
  priceCents: number;
  status: Status;
  paymentMethod: string | null;
  notes: string | null;
};

const STATUS_OPTS: [Status, string][] = [
  ["CONFIRMED", "Confirmada"],
  ["COMPLETED", "Realizada"],
  ["NO_SHOW", "No asistió"],
  ["CANCELLED", "Cancelada"],
];

const crc = (cents: number) => `₡${Math.round(cents / 100).toLocaleString("es-CR")}`;

export function AdminBookingForm(props: {
  clients: Client[];
  services: Service[];
  paymentMethods: string[];
  today: string;
  initial?: BookingInitial;
  presetClientId?: string;
}) {
  const router = useRouter();
  const init = props.initial;
  const [pending, start] = useTransition();
  const [clientId, setClientId] = useState(init?.userId ?? props.presetClientId ?? "");
  const [newClient, setNewClient] = useState(false);
  const [search, setSearch] = useState("");
  const [nc, setNc] = useState({ name: "", email: "", phone: "" });
  const [serviceId, setServiceId] = useState(init?.serviceId ?? "");
  const [date, setDate] = useState(init?.date ?? props.today);
  const [time, setTime] = useState(init?.time ?? "");
  const [price, setPrice] = useState(init ? String(Math.round(init.priceCents / 100)) : "");
  const [status, setStatus] = useState<Status>(init?.status ?? "CONFIRMED");
  const [payment, setPayment] = useState(init?.paymentMethod ?? "");
  const [notes, setNotes] = useState(init?.notes ?? "");
  const [notify, setNotify] = useState(true);
  const [slots, setSlots] = useState<{ start: string; label: string }[] | null>(null);

  const client = props.clients.find((c) => c.id === clientId);
  const service = props.services.find((s) => s.id === serviceId);
  const matches = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return props.clients.slice(0, 6);
    return props.clients.filter((c) => `${c.name} ${c.email} ${c.phone ?? ""}`.toLowerCase().includes(t)).slice(0, 6);
  }, [search, props.clients]);

  useEffect(() => {
    if (!serviceId || !date) return setSlots(null);
    let cancelled = false;
    setSlots(null);
    const qs = new URLSearchParams({ servicio: serviceId, fecha: date });
    if (init?.id) qs.set("excluir", init.id);
    fetch(`/api/horarios?${qs}`)
      .then((r) => r.json())
      .then((j) => !cancelled && setSlots(j.slots ?? []))
      .catch(() => !cancelled && setSlots([]));
    return () => {
      cancelled = true;
    };
  }, [serviceId, date, init?.id]);

  function pickService(id: string) {
    setServiceId(id);
    const s = props.services.find((x) => x.id === id);
    if (s && (!init || price === "")) setPrice(s.priceCents ? String(Math.round(s.priceCents / 100)) : "");
  }

  function submit(force = false) {
    const input: AdminBookingInput = {
      id: init?.id,
      userId: newClient ? undefined : clientId || undefined,
      newClient: newClient ? { name: nc.name, email: nc.email, phone: nc.phone || undefined } : undefined,
      serviceId,
      date,
      time,
      price,
      status,
      paymentMethod: payment || undefined,
      notes,
      notify,
      force,
    };
    start(async () => {
      const r = await saveAdminBooking(input);
      if (!r.ok && "warnings" in r) {
        const ok = await swal.fire({
          icon: "warning",
          title: "Revisa antes de guardar",
          html: `<ul class="swal-list">${r.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>`,
          showCancelButton: true,
          confirmButtonText: "Guardar de todos modos",
          cancelButtonText: "Cambiar",
        });
        if (ok.isConfirmed) submit(true);
        return;
      }
      if (!r.ok) {
        swal.fire({ icon: "error", title: "No se pudo guardar", text: r.error, confirmButtonText: "Entendido" });
        return;
      }
      if (r.previewUrl) {
        await swal.fire({
          icon: "success",
          title: init ? "Reserva actualizada" : "Reserva creada",
          html: `Correo de prueba enviado. <a href="${r.previewUrl}" target="_blank" rel="noreferrer">Ver el correo</a>`,
          confirmButtonText: "Listo",
        });
      } else {
        toast.fire({ icon: "success", titleText: init ? "Reserva actualizada" : "Reserva creada", text: r.mailed ? "Le avisamos por correo al cliente" : undefined });
      }
      router.push(`/admin/reservas/${r.id}`);
      router.refresh();
    });
  }

  const morning = slots?.filter((s) => Number(s.label.slice(0, 2)) < 12) ?? [];
  const afternoon = slots?.filter((s) => Number(s.label.slice(0, 2)) >= 12) ?? [];

  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <section className="card">
        <div className="section-title">
          <span className="step-num">1</span>
          <h3>Cliente</h3>
        </div>
        {client && !newClient ? (
          <div className="picked">
            <div>
              <strong>{client.name}</strong>
              <div className="muted small">
                {client.email}
                {client.phone ? ` · ${client.phone}` : ""}
              </div>
            </div>
            <button type="button" className="btn ghost small" onClick={() => setClientId("")}>
              Cambiar
            </button>
          </div>
        ) : newClient ? (
          <>
            <div className="form-cols">
              <label className="field">
                <span>Nombre</span>
                <input value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} required placeholder="Nombre y apellido" />
              </label>
              <label className="field">
                <span>Teléfono</span>
                <input value={nc.phone} onChange={(e) => setNc({ ...nc, phone: e.target.value })} inputMode="tel" placeholder="8888-8888" />
              </label>
            </div>
            <label className="field">
              <span>Correo</span>
              <input type="email" value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} required placeholder="cliente@correo.com" />
            </label>
            <p className="muted small">El cliente podrá ver sus citas registrándose con este mismo correo.</p>
            <button type="button" className="btn ghost small" onClick={() => setNewClient(false)}>
              ← Buscar cliente existente
            </button>
          </>
        ) : (
          <>
            <label className="field">
              <span>Buscar cliente</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, correo o teléfono" autoComplete="off" />
            </label>
            <div className="client-results">
              {matches.map((c) => (
                <button type="button" key={c.id} className="client-opt" onClick={() => setClientId(c.id)}>
                  <strong>{c.name}</strong>
                  <span className="muted small">
                    {c.email}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </span>
                </button>
              ))}
              {matches.length === 0 && <p className="muted small">No hay clientes con ese dato.</p>}
            </div>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => {
                setNewClient(true);
                if (search.includes("@")) setNc({ ...nc, email: search.trim() });
                else if (search.trim()) setNc({ ...nc, name: search.trim() });
              }}
            >
              + Cliente nuevo
            </button>
          </>
        )}
      </section>

      <section className="card">
        <div className="section-title">
          <span className="step-num">2</span>
          <h3>Servicio y horario</h3>
        </div>
        <label className="field">
          <span>Servicio</span>
          <select value={serviceId} onChange={(e) => pickService(e.target.value)} required>
            <option value="" disabled>
              Elige un servicio
            </option>
            {props.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.durationMin} min · {s.priceCents ? crc(s.priceCents) : "a consultar"}
                {s.active ? "" : " (oculto)"}
              </option>
            ))}
          </select>
        </label>
        <div className="form-cols">
          <label className="field">
            <span>Fecha</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="field">
            <span>Hora</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} step={300} required />
          </label>
        </div>
        {serviceId && (
          <div className="slot-hint">
            <p className="muted small">Horarios libres ese día (toca uno o escribe otra hora arriba):</p>
            {slots === null ? (
              <div className="slot-grid">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i} className="slot skeleton" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="muted small">No quedan horarios libres en el horario de atención. Puedes escribir una hora igual.</p>
            ) : (
              [
                ["Mañana", morning],
                ["Tarde", afternoon],
              ].map(([t, list]) =>
                (list as typeof morning).length ? (
                  <div key={t as string}>
                    <p className="slot-group">{t as string}</p>
                    <div className="slot-grid">
                      {(list as typeof morning).map((s) => (
                        <button type="button" key={s.start} className={`slot ${time === s.label ? "active" : ""}`} onClick={() => setTime(s.label)}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null,
              )
            )}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-title">
          <span className="step-num">3</span>
          <h3>Cobro y estado</h3>
        </div>
        <div className="form-cols">
          <label className="field">
            <span>Precio (₡)</span>
            <div className="input-prefix">
              <span>₡</span>
              <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder={service?.priceCents ? String(service.priceCents / 100) : "0"} />
            </div>
          </label>
          <label className="field">
            <span>Método de pago</span>
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="">Sin registrar</option>
              {props.paymentMethods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field">
          <span>Estado</span>
          <div className="pill-radio">
            {STATUS_OPTS.map(([v, l]) => (
              <label key={v} className={`st-${v.toLowerCase()}`}>
                <input type="radio" name="status" value={v} checked={status === v} onChange={() => setStatus(v)} />
                <span>{l}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Notas internas</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferencias, alergias, zona a trabajar…" />
        </label>
        <label className="check">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Avisar al cliente por correo
        </label>
      </section>

      <div className={`form-footer ${init ? "static" : ""}`}>
        {service && (
          <span className="muted">
            {service.name} · {service.durationMin} min · <strong>{price ? `₡${Number(price).toLocaleString("es-CR")}` : "₡0"}</strong>
          </span>
        )}
        <button className="btn" disabled={pending}>
          {pending ? "Guardando…" : init ? "Guardar cambios" : "Crear reserva"}
        </button>
      </div>
    </form>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

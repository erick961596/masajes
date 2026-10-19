"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DayOption } from "@/lib/days";
import { swal } from "@/lib/swal";
import { bookAction, loginAccount, registerAccount } from "@/app/actions";
import { SlotSelector, type Slot } from "./SlotSelector";

export type WizardService = { id: string; name: string; description: string | null; durationMin: number; price: string };
type User = { name: string; email: string } | null;

const STEPS = ["Servicio", "Día y hora", "Tus datos", "Confirmar"];

export function BookingWizard(props: { services: WizardService[]; days: DayOption[]; initialServiceId?: string; user: User }) {
  const router = useRouter();
  const initial = props.services.find((s) => s.id === props.initialServiceId);
  const [step, setStep] = useState(initial ? 1 : 0);
  const [service, setService] = useState<WizardService | undefined>(initial);
  const [slot, setSlot] = useState<{ slot: Slot; day: DayOption } | null>(null);
  const [notes, setNotes] = useState("");
  const [user, setUser] = useState<User>(props.user);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Al cambiar de paso, sube al inicio del wizard (importante en móvil).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const top = ref.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  function pickService(s: WizardService) {
    setService(s);
    setSlot(null);
    setStep(1);
  }

  function pickSlot(s: Slot, date: string) {
    setSlot({ slot: s, day: props.days.find((d) => d.date === date)! });
  }

  function afterSlot() {
    setStep(user ? 3 : 2);
  }

  function submitAccount(form: FormData) {
    start(async () => {
      const data = Object.fromEntries(form) as Record<string, string>;
      const r = mode === "login" ? await loginAccount(data) : await registerAccount(data);
      if (!r.ok) {
        swal.fire({ icon: "error", title: "Revisa tus datos", text: r.error, confirmButtonText: "Entendido" });
        return;
      }
      setUser(r.user);
      router.refresh();
      setStep(3);
    });
  }

  function confirm() {
    if (!service || !slot) return;
    start(async () => {
      const r = await bookAction({ serviceId: service.id, start: slot.slot.start, notes });
      if (!r.ok) {
        await swal.fire({ icon: "error", title: "No se pudo reservar", text: r.error, confirmButtonText: "Elegir otro horario" });
        if (r.code === "auth") return setStep(2);
        setSlot(null);
        setReloadKey((k) => k + 1);
        return setStep(1);
      }
      await swal.fire({
        icon: "success",
        title: "¡Reserva confirmada!",
        html: `Te esperamos el <b>${slot.day.long}</b> a las <b>${slot.slot.label}</b>.<br/>Te enviamos los detalles a tu correo.`,
        confirmButtonText: "Ver mi reserva",
      });
      router.push(`/reserva/${r.id}`);
      router.refresh();
    });
  }

  return (
    <div className="wizard" ref={ref} style={{ scrollMarginTop: 80 }}>
      <ol className="stepper">
        {STEPS.map((label, i) => (
          <li key={label} className={i < step ? "done" : i === step ? "current" : ""}>
            <button type="button" disabled={i > step || pending || (i === 2 && !!user && step === 3)} onClick={() => setStep(i)}>
              <span className="dot">{i < step ? "✓" : i + 1}</span>
              <span className="lbl">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="fade-in">
          <h2 className="step-title">¿Qué te gustaría reservar?</h2>
          <div className="service-list">
            {props.services.map((s) => (
              <button key={s.id} type="button" className={`service-option ${service?.id === s.id ? "active" : ""}`} onClick={() => pickService(s)}>
                <span className="service-name">{s.name}</span>
                {s.description && <span className="muted">{s.description}</span>}
                <span className="service-meta">
                  <span className="chip">{s.durationMin} min</span>
                  <span className="price">{s.price}</span>
                </span>
              </button>
            ))}
          </div>
          {props.services.length === 0 && <p className="muted">Aún no hay servicios disponibles.</p>}
        </section>
      )}

      {step === 1 && service && (
        <section className="fade-in">
          <h2 className="step-title">Elige día y hora</h2>
          <p className="muted">
            {service.name} · {service.durationMin} min · {service.price}
          </p>
          <SlotSelector serviceId={service.id} days={props.days} selected={slot?.slot.start} onSelect={pickSlot} reloadKey={reloadKey} />
          <label className="field">
            <span>Notas para tu terapeuta (opcional)</span>
            <textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Alguna lesión, zona a trabajar, presión preferida…" />
          </label>
          <div className="wizard-nav">
            <button type="button" className="btn ghost" onClick={() => setStep(0)}>
              ← Atrás
            </button>
            <button type="button" className="btn" disabled={!slot} onClick={afterSlot}>
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="fade-in">
          <h2 className="step-title">{mode === "register" ? "Crea tu cuenta" : "Entra a tu cuenta"}</h2>
          <p className="muted">Con tu cuenta puedes ver, reagendar o cancelar tus citas cuando quieras.</p>
          <div className="tabs">
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              Soy nuevo
            </button>
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Ya tengo cuenta
            </button>
          </div>
          <form action={submitAccount} className="form-grid" key={mode}>
            {mode === "register" && (
              <label className="field">
                <span>Nombre</span>
                <input name="name" required autoComplete="name" />
              </label>
            )}
            <label className="field">
              <span>Correo</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
            {mode === "register" && (
              <label className="field">
                <span>Teléfono (opcional)</span>
                <input name="phone" type="tel" autoComplete="tel" />
              </label>
            )}
            <label className="field">
              <span>Contraseña</span>
              <input
                name="password"
                type="password"
                required
                minLength={mode === "register" ? 8 : undefined}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </label>
            <div className="wizard-nav">
              <button type="button" className="btn ghost" onClick={() => setStep(1)}>
                ← Atrás
              </button>
              <button className="btn" disabled={pending}>
                {pending ? "Un momento…" : mode === "register" ? "Crear cuenta y continuar" : "Entrar y continuar"}
              </button>
            </div>
          </form>
        </section>
      )}

      {step === 3 && service && slot && (
        <section className="fade-in">
          <h2 className="step-title">Confirma tu reserva</h2>
          <div className="summary">
            <div>
              <span className="muted">Servicio</span>
              <strong>{service.name}</strong>
            </div>
            <div>
              <span className="muted">Cuándo</span>
              <strong className="capitalize">
                {slot.day.long} · {slot.slot.label}
              </strong>
            </div>
            <div>
              <span className="muted">Duración</span>
              <strong>{service.durationMin} min</strong>
            </div>
            <div>
              <span className="muted">Total</span>
              <strong className="price">{service.price}</strong>
            </div>
            {user && (
              <div>
                <span className="muted">A nombre de</span>
                <strong>{user.name}</strong>
              </div>
            )}
            {notes && (
              <div className="full">
                <span className="muted">Notas</span>
                <span>{notes}</span>
              </div>
            )}
          </div>
          <div className="wizard-nav">
            <button type="button" className="btn ghost" onClick={() => setStep(1)} disabled={pending}>
              ← Atrás
            </button>
            <button type="button" className="btn" onClick={confirm} disabled={pending}>
              {pending ? "Reservando…" : "Confirmar reserva"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

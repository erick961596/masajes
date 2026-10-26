"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SocialIcon } from "./SocialIcon";

type Social = { name: string; handle: string; url: string };

/** Burbuja flotante (abajo a la derecha) con accesos rápidos de contacto. */
export function ChatBubble({ businessName, social }: { businessName: string; social: Social[] }) {
  const [open, setOpen] = useState(false);
  const whatsapp = social.find((s) => s.name === "WhatsApp");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="bubble-wrap">
      {open && (
        <div className="bubble-panel" role="dialog" aria-label={`Contacto ${businessName}`}>
          <div className="bubble-head">
            <span className="bubble-avatar" aria-hidden>
              ❀
            </span>
            <div>
              <strong>{businessName}</strong>
              <span className="bubble-status">Respondemos en minutos</span>
            </div>
          </div>
          <p className="bubble-msg">¡Hola! 👋 ¿En qué te podemos ayudar?</p>
          <div className="bubble-actions">
            <Link href="/reservar" className="bubble-action primary" onClick={() => setOpen(false)}>
              📅 Reservar una cita
            </Link>
            {whatsapp && (
              <a href={whatsapp.url} className="bubble-action" target="_blank" rel="noreferrer">
                <SocialIcon name="WhatsApp" size={18} /> Escríbenos por WhatsApp
              </a>
            )}
            <Link href="/cuenta" className="bubble-action" onClick={() => setOpen(false)}>
              🗓️ Ver o cambiar mi cita
            </Link>
          </div>
          <div className="bubble-social">
            {social
              .filter((s) => s.name !== "WhatsApp")
              .map((s) => (
                <a key={s.name} href={s.url} target="_blank" rel="noreferrer" aria-label={s.name} title={`${s.name} ${s.handle}`}>
                  <SocialIcon name={s.name} size={18} />
                </a>
              ))}
          </div>
        </div>
      )}
      <button type="button" className="bubble" aria-label={open ? "Cerrar contacto" : "Abrir contacto"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? <span className="bubble-x">✕</span> : <SocialIcon name="WhatsApp" size={28} />}
      </button>
    </div>
  );
}

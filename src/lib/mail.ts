import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "./config";
import { fmtDateTime, money } from "./format";

/**
 * SMTP_HOST="ethereal" crea sola una cuenta de prueba en ethereal.email (no entrega correos reales:
 * cada envío deja un enlace de vista previa en los logs y en /admin/correo).
 * Cualquier otro host (Mailtrap Sandbox, Brevo, Gmail…) se usa tal cual.
 */
let cached: Promise<Transporter | null> | null = null;

export function mailMode() {
  const host = (process.env.SMTP_HOST || "").trim();
  if (!host) return { mode: "off" as const, host: "" };
  if (host.toLowerCase() === "ethereal") return { mode: "ethereal" as const, host: "smtp.ethereal.email" };
  return { mode: "smtp" as const, host };
}

function transport() {
  if (cached) return cached;
  const { mode, host } = mailMode();
  cached = (async () => {
    if (mode === "off") return null;
    if (mode === "ethereal") {
      const acc = await nodemailer.createTestAccount();
      console.info(`[mail] cuenta Ethereal de prueba: ${acc.user} / ${acc.pass} (entra en https://ethereal.email/login)`);
      return nodemailer.createTransport({ host: acc.smtp.host, port: acc.smtp.port, secure: acc.smtp.secure, auth: { user: acc.user, pass: acc.pass } });
    }
    const port = Number(process.env.SMTP_PORT || 587);
    return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  })().catch((err) => {
    console.error("[mail] no se pudo preparar el SMTP", err);
    cached = null;
    return null;
  });
  return cached;
}

export type SendResult = { ok: boolean; previewUrl?: string; error?: string };

export async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const t = await transport();
  if (!t) {
    console.warn(`[mail] SMTP no configurado, no se envió: ${subject} -> ${to}`);
    return { ok: false, error: "SMTP no configurado" };
  }
  try {
    const info = await t.sendMail({ from: process.env.MAIL_FROM || `${config.businessName} <reservas@anispa.test>`, to, subject, html });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) console.info(`[mail] vista previa: ${previewUrl}`);
    return { ok: true, previewUrl };
  } catch (err) {
    // Un fallo de correo no debe romper la reserva.
    console.error("[mail] error al enviar", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

type BookingMail = {
  id: string;
  start: Date;
  priceCents: number;
  service: { name: string; durationMin: number };
  user: { name: string; email: string };
};

export type BookingEvent = "created" | "rescheduled" | "cancelled";

const titles: Record<BookingEvent, string> = {
  created: "Reserva confirmada",
  rescheduled: "Reserva reagendada",
  cancelled: "Reserva cancelada",
};

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function notifyBooking(event: BookingEvent, b: BookingMail): Promise<SendResult> {
  const link = `${config.appUrl}/reserva/${b.id}`;
  const body = `
    <div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2>${titles[event]}</h2>
      <p><strong>${esc(b.service.name)}</strong> (${b.service.durationMin} min)</p>
      <p>${esc(fmtDateTime(b.start))}</p>
      <p>${b.priceCents ? `Precio: ${money(b.priceCents)}` : "Precio a consultar"}</p>
      <p>Folio: <code>${b.id}</code></p>
      ${event !== "cancelled" ? `<p><a href="${link}">Ver, reagendar o cancelar</a></p><p style="color:#777;font-size:13px">¿Aún no tienes contraseña? Regístrate con este mismo correo y verás tus citas.</p>` : ""}
    </div>`;
  const subject = `${titles[event]} · ${b.service.name} · ${fmtDateTime(b.start)}`;
  const r = await send(b.user.email, subject, `<p>Hola ${esc(b.user.name)},</p>${body}`);
  if (config.adminEmail && config.adminEmail !== b.user.email) {
    await send(config.adminEmail, `[Admin] ${subject}`, `<p>Cliente: ${esc(b.user.name)} &lt;${esc(b.user.email)}&gt;</p>${body}`);
  }
  return r;
}

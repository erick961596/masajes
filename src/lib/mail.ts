import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "./config";
import { fmtDateTime, money } from "./format";
import { db } from "./db";
import { getNotifyEmails } from "./settings";

/**
 * Correo vía Mailtrap (SMTP).
 * - MAILTRAP_TOKEN: el API token de Mailtrap. Con él se usa Mailtrap Email Sending
 *   (live.smtp.mailtrap.io:587, usuario "api"). MAIL_FROM debe ser de un dominio verificado en Mailtrap.
 * - SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS: opcionales, para usar otro servidor
 *   (p. ej. el Sandbox de Mailtrap: sandbox.smtp.mailtrap.io:2525 con el usuario/contraseña del inbox).
 * - Sin token ni SMTP_PASS: modo prueba con Ethereal (cuenta automática, los correos no llegan a nadie).
 */
let cachedEthereal: Promise<Transporter | null> | null = null;
let cachedSmtp: Transporter | null = null;

function smtpSettings() {
  const pass = process.env.SMTP_PASS || process.env.MAILTRAP_TOKEN;
  if (!pass) return null;
  const host = process.env.SMTP_HOST || "live.smtp.mailtrap.io";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || "api";
  return { host, port, user, pass, secure: port === 465 };
}

export function mailMode() {
  const s = smtpSettings();
  if (!s) return { mode: "ethereal" as const, host: "smtp.ethereal.email" };
  return { mode: s.host.includes("mailtrap") ? ("mailtrap" as const) : ("smtp" as const), host: `${s.host}:${s.port}` };
}

function smtp() {
  const s = smtpSettings();
  if (!s) return null;
  cachedSmtp ??= nodemailer.createTransport({ host: s.host, port: s.port, secure: s.secure, auth: { user: s.user, pass: s.pass } });
  return cachedSmtp;
}

function ethereal() {
  cachedEthereal ??= nodemailer
    .createTestAccount()
    .then((acc) => {
      console.info(`[mail] cuenta Ethereal de prueba: ${acc.user} (https://ethereal.email/login)`);
      return nodemailer.createTransport({ host: acc.smtp.host, port: acc.smtp.port, secure: acc.smtp.secure, auth: { user: acc.user, pass: acc.pass } });
    })
    .catch((err) => {
      console.error("[mail] no se pudo crear la cuenta de Ethereal", err);
      cachedEthereal = null;
      return null;
    });
  return cachedEthereal;
}

export type SendResult = { ok: boolean; previewUrl?: string; error?: string; via?: string };

async function attempt(t: Transporter | null, via: string, msg: { to: string; subject: string; html: string }): Promise<SendResult> {
  if (!t) return { ok: false, via, error: via === "ethereal" ? "No se pudo conectar con Ethereal" : "SMTP no disponible" };
  try {
    const info = await t.sendMail({ from: process.env.MAIL_FROM || `${config.businessName} <reservas@anispa.test>`, ...msg });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) console.info(`[mail] vista previa: ${previewUrl}`);
    return { ok: true, previewUrl, via };
  } catch (err) {
    console.error(`[mail] error al enviar por ${via}`, err);
    return { ok: false, via, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Envía un correo. Nunca lanza: un fallo de correo no debe romper la reserva. Queda registrado en MailLog. */
export async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const { mode } = mailMode();
  const r = mode === "ethereal" ? await attempt(await ethereal(), "ethereal", { to, subject, html }) : await attempt(smtp(), mode, { to, subject, html });
  try {
    await db.mailLog.create({
      data: { to, subject: subject.slice(0, 300), ok: r.ok, previewUrl: r.previewUrl ?? null, error: r.error?.slice(0, 500) ?? null, via: r.via ?? mode },
    });
  } catch (err) {
    console.error("[mail] no se pudo guardar el registro", err);
  }
  return r;
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
  // Copia al equipo: los correos de Admin → Configuración (o ADMIN_EMAIL si nunca se configuró).
  const team = (await getNotifyEmails()).filter((e) => e !== b.user.email.toLowerCase());
  if (team.length) {
    await send(team.join(", "), `[Admin] ${subject}`, `<p>Cliente: ${esc(b.user.name)} &lt;${esc(b.user.email)}&gt;</p>${body}`);
  }
  return r;
}

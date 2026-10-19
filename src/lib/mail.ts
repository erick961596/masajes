import nodemailer from "nodemailer";
import { config } from "./config";
import { fmtDateTime, money } from "./format";

function transport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function send(to: string, subject: string, html: string) {
  const t = transport();
  if (!t) {
    console.warn(`[mail] SMTP no configurado, no se envió: ${subject} -> ${to}`);
    return;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || `${config.businessName} <no-reply@example.com>`, to, subject, html });
  } catch (err) {
    // Un fallo de correo no debe romper la reserva.
    console.error("[mail] error al enviar", err);
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

export async function notifyBooking(event: BookingEvent, b: BookingMail) {
  const link = `${config.appUrl}/reserva/${b.id}`;
  const body = `
    <div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2>${titles[event]}</h2>
      <p><strong>${esc(b.service.name)}</strong> (${b.service.durationMin} min)</p>
      <p>${esc(fmtDateTime(b.start))}</p>
      <p>Precio: ${money(b.priceCents)}</p>
      <p>Folio: <code>${b.id}</code></p>
      ${event !== "cancelled" ? `<p><a href="${link}">Ver, reagendar o cancelar</a></p>` : ""}
    </div>`;
  const subject = `${titles[event]} · ${b.service.name} · ${fmtDateTime(b.start)}`;
  await send(b.user.email, subject, `<p>Hola ${esc(b.user.name)},</p>${body}`);
  if (config.adminEmail) {
    await send(config.adminEmail, `[Admin] ${subject}`, `<p>Cliente: ${esc(b.user.name)} &lt;${esc(b.user.email)}&gt;</p>${body}`);
  }
}

import { z } from "zod";
import { db } from "./db";
import { config } from "./config";

export const NOTIFY_EMAILS = "notifyEmails";

/** "a@x.com, b@y.com; c@z.com" -> lista limpia y sin repetidos. Devuelve también los inválidos. */
export function parseEmailList(raw: string) {
  const parts = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    if (!z.email().safeParse(p).success) invalid.push(p);
    else if (!valid.includes(p)) valid.push(p);
  }
  return { valid, invalid };
}

export async function getSetting(key: string) {
  const row = await db.setting.findUnique({ where: { key } }).catch(() => null);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/**
 * Correos que reciben copia de cada reserva, cambio o cancelación.
 * Si nunca se ha guardado en Configuración, se usa ADMIN_EMAIL.
 */
export async function getNotifyEmails() {
  const v = await getSetting(NOTIFY_EMAILS);
  if (v === null) return config.adminEmail ? [config.adminEmail] : [];
  return parseEmailList(v).valid;
}

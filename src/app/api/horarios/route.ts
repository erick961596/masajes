import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { availableSlots, DATE_RE } from "@/lib/slots";
import { fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/** GET /api/horarios?servicio=<id>&fecha=YYYY-MM-DD[&excluir=<reservaId>] */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const serviceId = url.searchParams.get("servicio") || "";
  const date = url.searchParams.get("fecha") || "";
  const excluir = url.searchParams.get("excluir") || "";
  const exclude = /^[0-9a-f-]{36}$/i.test(excluir) ? excluir : undefined;
  if (!DATE_RE.test(date)) return NextResponse.json({ error: "fecha inválida" }, { status: 400 });
  const service = await db.service.findFirst({ where: { id: serviceId }, select: { durationMin: true } }).catch(() => null);
  if (!service) return NextResponse.json({ error: "servicio no encontrado" }, { status: 404 });
  const slots = await availableSlots(date, service.durationMin, exclude);
  return NextResponse.json({ slots: slots.map((s) => ({ start: s.toISOString(), label: fmtTime(s) })) });
}

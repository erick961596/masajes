import { db } from "./db";

export async function bookingFormData() {
  const [clients, services] = await Promise.all([
    db.user.findMany({ where: { role: "CLIENT" }, select: { id: true, name: true, email: true, phone: true }, orderBy: { name: "asc" } }),
    db.service.findMany({ select: { id: true, name: true, durationMin: true, priceCents: true, active: true }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
  ]);
  return { clients, services };
}

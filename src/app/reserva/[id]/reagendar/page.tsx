import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { upcomingDays } from "@/lib/days";
import { RescheduleClient } from "@/components/RescheduleClient";

export const metadata = { title: "Reagendar" };

export default async function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/reserva/${id}/reagendar`);
  const b = await db.booking.findUnique({ where: { id }, include: { service: true } }).catch(() => null);
  if (!b || (b.userId !== user.id && user.role !== "ADMIN")) notFound();
  if (b.status !== "CONFIRMED" || b.start <= new Date()) redirect(`/reserva/${id}`);
  const days = await upcomingDays(28);

  return (
    <div className="medium">
      <p>
        <Link href={`/reserva/${b.id}`}>← Volver a la cita</Link>
      </p>
      <div className="page-head">
        <h1>Reagendar {b.service.name}</h1>
        <p className="muted capitalize">Ahora: {fmtDateTime(b.start)}</p>
      </div>
      <div className="wizard">
        <h2 className="step-title">Elige el nuevo horario</h2>
        <RescheduleClient bookingId={b.id} serviceId={b.serviceId} days={days} />
      </div>
    </div>
  );
}

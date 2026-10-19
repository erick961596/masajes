import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { Notice, SP, str } from "@/components/Notice";
import { SlotPicker } from "@/components/SlotPicker";
import { rescheduleBooking } from "@/app/actions";

export default async function ReschedulePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/reserva/${id}/reagendar`);
  const b = await db.booking.findUnique({ where: { id }, include: { service: true } }).catch(() => null);
  if (!b || (b.userId !== user.id && user.role !== "ADMIN")) notFound();
  if (b.status !== "CONFIRMED" || b.start <= new Date()) redirect(`/reserva/${id}`);

  return (
    <>
      <h1>Reagendar {b.service.name}</h1>
      <p className="muted capitalize">Horario actual: {fmtDateTime(b.start)}</p>
      <Notice error={str(sp.error)} />
      <SlotPicker
        basePath={`/reserva/${b.id}/reagendar`}
        date={str(sp.fecha)}
        durationMin={b.service.durationMin}
        excludeBookingId={b.id}
        action={rescheduleBooking}
        hidden={{ id: b.id }}
        buttonPrefix="Mover a "
      />
    </>
  );
}

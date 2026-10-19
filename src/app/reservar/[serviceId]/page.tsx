import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { Notice, SP, str } from "@/components/Notice";
import { SlotPicker } from "@/components/SlotPicker";
import { createBooking } from "@/app/actions";

export default async function BookPage({ params, searchParams }: { params: Promise<{ serviceId: string }>; searchParams: SP }) {
  const { serviceId } = await params;
  const sp = await searchParams;
  await requireUser(`/reservar/${serviceId}`);
  const service = await db.service.findFirst({ where: { id: serviceId, active: true } }).catch(() => null);
  if (!service) notFound();

  return (
    <>
      <h1>{service.name}</h1>
      <p className="muted">
        {service.durationMin} min · {money(service.priceCents)}
      </p>
      <Notice error={str(sp.error)} />
      <p>Elige el día y toca un horario para confirmar.</p>
      <SlotPicker
        basePath={`/reservar/${service.id}`}
        date={str(sp.fecha)}
        durationMin={service.durationMin}
        action={createBooking}
        hidden={{ serviceId: service.id }}
        withNotes
      />
    </>
  );
}

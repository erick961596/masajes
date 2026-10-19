"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DayOption } from "@/lib/days";
import { swal } from "@/lib/swal";
import { rescheduleAction } from "@/app/actions";
import { SlotSelector, type Slot } from "./SlotSelector";

export function RescheduleClient(props: { bookingId: string; serviceId: string; days: DayOption[] }) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, start] = useTransition();

  async function pick(s: Slot, date: string) {
    if (pending) return;
    const day = props.days.find((d) => d.date === date)!;
    const r = await swal.fire({
      icon: "question",
      title: "¿Mover tu cita?",
      html: `Nuevo horario: <b>${day.long}, ${s.label}</b>`,
      showCancelButton: true,
      confirmButtonText: "Sí, mover",
      cancelButtonText: "No",
    });
    if (!r.isConfirmed) return;
    start(async () => {
      const res = await rescheduleAction({ id: props.bookingId, start: s.start });
      if (!res.ok) {
        await swal.fire({ icon: "error", title: "No se pudo reagendar", text: res.error, confirmButtonText: "Entendido" });
        setReloadKey((k) => k + 1);
        return;
      }
      router.push(`/reserva/${props.bookingId}?ok=reagendada`);
      router.refresh();
    });
  }

  return <SlotSelector serviceId={props.serviceId} days={props.days} excludeBookingId={props.bookingId} onSelect={pick} reloadKey={reloadKey} />;
}

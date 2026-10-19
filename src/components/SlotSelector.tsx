"use client";

import { useEffect, useState } from "react";
import type { DayOption } from "@/lib/days";

export type Slot = { start: string; label: string };

/** Tira de días + rejilla de horarios libres, cargados desde /api/horarios. */
export function SlotSelector(props: {
  serviceId: string;
  days: DayOption[];
  excludeBookingId?: string;
  selected?: string;
  onSelect: (slot: Slot, date: string) => void;
  reloadKey?: number;
}) {
  const firstOpen = props.days.find((d) => d.open)?.date ?? props.days[0]?.date;
  const [date, setDate] = useState(firstOpen);
  const [slots, setSlots] = useState<Slot[] | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setSlots(null);
    const qs = new URLSearchParams({ servicio: props.serviceId, fecha: date });
    if (props.excludeBookingId) qs.set("excluir", props.excludeBookingId);
    fetch(`/api/horarios?${qs}`)
      .then((r) => r.json())
      .then((j) => !cancelled && setSlots(j.slots ?? []))
      .catch(() => !cancelled && setSlots([]));
    return () => {
      cancelled = true;
    };
  }, [date, props.serviceId, props.excludeBookingId, props.reloadKey]);

  const morning = slots?.filter((s) => Number(s.label.slice(0, 2)) < 14) ?? [];
  const afternoon = slots?.filter((s) => Number(s.label.slice(0, 2)) >= 14) ?? [];

  return (
    <div className="slot-selector">
      <div className="day-strip" role="listbox" aria-label="Día">
        {props.days.map((d) => (
          <button
            key={d.date}
            type="button"
            role="option"
            aria-selected={d.date === date}
            disabled={!d.open}
            className={`day ${d.date === date ? "active" : ""}`}
            onClick={() => setDate(d.date)}
          >
            <span className="dow">{d.dow}</span>
            <span className="num">{d.day}</span>
            <span className="mon">{d.month}</span>
          </button>
        ))}
      </div>

      {slots === null ? (
        <div className="slot-grid">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="slot skeleton" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="empty">
          <p>No quedan horarios este día.</p>
          <p className="muted">Prueba con otro día de la lista.</p>
        </div>
      ) : (
        [
          ["Mañana", morning],
          ["Tarde", afternoon],
        ].map(([title, list]) =>
          (list as Slot[]).length ? (
            <div key={title as string}>
              <p className="slot-group">{title as string}</p>
              <div className="slot-grid">
                {(list as Slot[]).map((s) => (
                  <button
                    key={s.start}
                    type="button"
                    className={`slot ${props.selected === s.start ? "active" : ""}`}
                    onClick={() => props.onSelect(s, date!)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null,
        )
      )}
    </div>
  );
}

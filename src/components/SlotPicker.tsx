import Link from "next/link";
import { availableSlots, DATE_RE, shiftDate, todayStr } from "@/lib/slots";
import { fmtDay, fmtTime } from "@/lib/format";

/** Selector de día + horarios libres. Cada horario es un botón que envía `action`. */
export async function SlotPicker(props: {
  basePath: string;
  date?: string;
  durationMin: number;
  excludeBookingId?: string;
  action: (form: FormData) => Promise<void>;
  hidden: Record<string, string>;
  buttonPrefix?: string;
  withNotes?: boolean;
}) {
  const today = todayStr();
  const date = props.date && DATE_RE.test(props.date) && props.date >= today ? props.date : today;
  const slots = await availableSlots(date, props.durationMin, props.excludeBookingId);
  const prev = shiftDate(date, -1);

  return (
    <div className="card">
      <form method="get" action={props.basePath} className="row">
        <label>
          Día
          <input type="date" name="fecha" defaultValue={date} min={today} />
        </label>
        <button className="secondary">Ver</button>
        {prev >= today && (
          <Link className="btn secondary" href={`${props.basePath}?fecha=${prev}`}>
            ← Anterior
          </Link>
        )}
        <Link className="btn secondary" href={`${props.basePath}?fecha=${shiftDate(date, 1)}`}>
          Siguiente →
        </Link>
      </form>
      <h3 className="capitalize">{fmtDay(date)}</h3>
      {slots.length === 0 ? (
        <p className="muted">No hay horarios disponibles este día.</p>
      ) : (
        <form action={props.action}>
          {Object.entries(props.hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {props.withNotes && (
            <label>
              Notas (opcional)
              <textarea name="notes" rows={2} maxLength={500} placeholder="Alguna lesión, preferencia de presión, etc." />
            </label>
          )}
          <div className="slots">
            {slots.map((s) => (
              <button key={s.toISOString()} name="start" value={s.toISOString()}>
                {props.buttonPrefix}
                {fmtTime(s)}
              </button>
            ))}
          </div>
        </form>
      )}
    </div>
  );
}

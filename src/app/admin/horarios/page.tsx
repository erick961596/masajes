import { db } from "@/lib/db";
import { DAYS, minToHhmm } from "@/lib/format";
import { config } from "@/lib/config";
import { Notice } from "@/components/Notice";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SP, str } from "@/lib/params";
import { addWorkingHours, deleteWorkingHours } from "../actions";

export const metadata = { title: "Horarios" };

export default async function HoursAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const ranges = await db.workingHours.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }] });
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <>
      <Notice error={str(sp.error)} ok={str(sp.ok)} />
      <div className="admin-head">
        <div>
          <h1>Horario semanal</h1>
          <p className="muted">
            Los clientes ven horarios cada {config.slotStepMin} min dentro de estos rangos. Para la pausa de almuerzo crea dos rangos (09:00–12:00 y 13:00–18:00).
          </p>
        </div>
      </div>
      <div className="split">
        <form action={addWorkingHours} className="card">
          <div className="section-title">
            <h3>Agregar rango</h3>
          </div>
          <div className="day-checks">
            {order.map((d) => (
              <label key={d}>
                <input type="checkbox" name="day" value={d} />
                <span>{DAYS[d].slice(0, 3)}</span>
              </label>
            ))}
          </div>
          <div className="form-cols">
            <label className="field">
              <span>Desde</span>
              <input type="time" name="start" defaultValue="09:00" required />
            </label>
            <label className="field">
              <span>Hasta</span>
              <input type="time" name="end" defaultValue="18:00" required />
            </label>
          </div>
          <button className="btn">Agregar</button>
        </form>
        <div className="card list-card">
          {order.map((d) => {
            const rs = ranges.filter((r) => r.dayOfWeek === d);
            return (
              <div key={d} className="hours-row">
                <strong>{DAYS[d]}</strong>
                <div className="hours-chips">
                  {rs.length === 0 && <span className="badge past">Cerrado</span>}
                  {rs.map((r) => (
                    <form key={r.id} action={deleteWorkingHours}>
                      <input type="hidden" name="id" value={r.id} />
                      <span className="range">
                        {minToHhmm(r.startMin)}–{minToHhmm(r.endMin)}
                        <ConfirmButton className="icon" title={`¿Quitar ${DAYS[d]} ${minToHhmm(r.startMin)}–${minToHhmm(r.endMin)}?`} confirmText="Quitar">
                          ✕
                        </ConfirmButton>
                      </span>
                    </form>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

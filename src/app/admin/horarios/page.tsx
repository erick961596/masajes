import { db } from "@/lib/db";
import { DAYS, minToHhmm } from "@/lib/format";
import { config } from "@/lib/config";
import { Notice } from "@/components/Notice";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SP, str } from "@/lib/params";
import { addWorkingHours, deleteWorkingHours } from "../actions";

export default async function HoursAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const ranges = await db.workingHours.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }] });
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <>
      <Notice error={str(sp.error)} ok={str(sp.ok)} />
      <div className="page-head">
        <h1>Horario semanal</h1>
        <p className="muted">
          Zona {config.tz}. Los clientes ven horarios cada {config.slotStepMin} min dentro de estos rangos. Para una pausa de comida crea dos rangos (09:00–14:00 y 15:00–19:00).
        </p>
      </div>
      <form action={addWorkingHours} className="card">
        <h3>Agregar rango</h3>
        <div className="day-checks">
          {order.map((d) => (
            <label key={d}>
              <input type="checkbox" name="day" value={d} />
              <span>{DAYS[d].slice(0, 3)}</span>
            </label>
          ))}
        </div>
        <div className="row">
          <label className="field" style={{ margin: 0 }}>
            <span>Desde</span>
            <input type="time" name="start" defaultValue="09:00" required />
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span>Hasta</span>
            <input type="time" name="end" defaultValue="18:00" required />
          </label>
          <button className="btn">Agregar</button>
        </div>
      </form>
      <div className="card table-wrap">
        <table>
          <tbody>
            {order.map((d) => {
              const rs = ranges.filter((r) => r.dayOfWeek === d);
              return (
                <tr key={d}>
                  <th style={{ width: 120 }}>{DAYS[d]}</th>
                  <td>
                    {rs.length === 0 && <span className="muted">Cerrado</span>}
                    <div className="row" style={{ gap: 8 }}>
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

import { db } from "@/lib/db";
import { DAYS, minToHhmm } from "@/lib/format";
import { config } from "@/lib/config";
import { Notice, SP, str } from "@/components/Notice";
import { addWorkingHours, deleteWorkingHours } from "../actions";

export default async function HoursAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const ranges = await db.workingHours.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }] });
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <>
      <h1>Horario semanal</h1>
      <p className="muted">
        Horas en zona {config.tz}. Los clientes ven horarios cada {config.slotStepMin} min dentro de estos rangos. Para una comida, crea dos rangos (ej. 09:00–14:00 y 15:00–19:00).
      </p>
      <Notice error={str(sp.error)} />
      <form action={addWorkingHours} className="card">
        <div className="row">
          {order.map((d) => (
            <label key={d} style={{ flexDirection: "row", gap: 4 }}>
              <input type="checkbox" name="day" value={d} /> {DAYS[d].slice(0, 3)}
            </label>
          ))}
        </div>
        <div className="row">
          <label>
            Desde
            <input type="time" name="start" defaultValue="09:00" required />
          </label>
          <label>
            Hasta
            <input type="time" name="end" defaultValue="18:00" required />
          </label>
          <label>
            <span>&nbsp;</span>
            <button>Agregar rango</button>
          </label>
        </div>
      </form>
      <div className="card table-wrap">
        <table>
          <tbody>
            {order.map((d) => {
              const rs = ranges.filter((r) => r.dayOfWeek === d);
              return (
                <tr key={d}>
                  <th>{DAYS[d]}</th>
                  <td>
                    {rs.length === 0 && <span className="muted">Cerrado</span>}
                    <div className="row">
                      {rs.map((r) => (
                        <form key={r.id} action={deleteWorkingHours} className="row" style={{ alignItems: "center" }}>
                          <input type="hidden" name="id" value={r.id} />
                          <span className="badge">
                            {minToHhmm(r.startMin)}–{minToHhmm(r.endMin)}
                          </span>
                          <button className="link" title="Quitar">✕</button>
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

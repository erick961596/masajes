import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { config } from "@/lib/config";
import { todayStr } from "@/lib/slots";
import { Notice, SP, str } from "@/components/Notice";
import { addBlock, deleteBlock } from "../actions";

export default async function BlocksAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const blocks = await db.blockedTime.findMany({ where: { end: { gt: new Date() } }, orderBy: { start: "asc" } });
  const today = todayStr();
  return (
    <>
      <h1>Bloqueos</h1>
      <p className="muted">
        Bloquea días u horas (vacaciones, festivos, pendientes). Deja las horas vacías para bloquear el día completo. Zona {config.tz}. Las reservas ya hechas no se cancelan solas.
      </p>
      <Notice error={str(sp.error)} />
      <form action={addBlock} className="card">
        <div className="row">
          <label>
            Desde el día
            <input type="date" name="startDate" defaultValue={today} required />
          </label>
          <label>
            Hora (opcional)
            <input type="time" name="startTime" />
          </label>
          <label>
            Hasta el día
            <input type="date" name="endDate" />
          </label>
          <label>
            Hora (opcional)
            <input type="time" name="endTime" />
          </label>
        </div>
        <label>
          Motivo
          <input name="reason" placeholder="Vacaciones, curso, etc." />
        </label>
        <button>Agregar bloqueo</button>
      </form>
      {blocks.length === 0 ? (
        <p className="muted">No hay bloqueos próximos.</p>
      ) : (
        <div className="card table-wrap">
          <table>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.id}>
                  <td className="capitalize">{fmtDateTime(b.start)}</td>
                  <td className="capitalize">{fmtDateTime(b.end)}</td>
                  <td>{b.reason}</td>
                  <td>
                    <form action={deleteBlock}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="link" title="Quitar">✕</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

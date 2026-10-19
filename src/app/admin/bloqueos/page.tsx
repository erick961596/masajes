import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { config } from "@/lib/config";
import { todayStr } from "@/lib/slots";
import { Notice } from "@/components/Notice";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SP, str } from "@/lib/params";
import { addBlock, deleteBlock } from "../actions";

export default async function BlocksAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const blocks = await db.blockedTime.findMany({ where: { end: { gt: new Date() } }, orderBy: { start: "asc" } });
  const today = todayStr();
  return (
    <>
      <Notice error={str(sp.error)} ok={str(sp.ok)} />
      <div className="page-head">
        <h1>Bloqueos</h1>
        <p className="muted">
          Vacaciones, festivos o pendientes. Deja las horas vacías para bloquear días completos. Zona {config.tz}. Las citas ya hechas no se cancelan solas.
        </p>
      </div>
      <form action={addBlock} className="card">
        <h3>Nuevo bloqueo</h3>
        <div className="row">
          <label className="field">
            <span>Desde el día</span>
            <input type="date" name="startDate" defaultValue={today} required />
          </label>
          <label className="field">
            <span>Hora (opcional)</span>
            <input type="time" name="startTime" />
          </label>
          <label className="field">
            <span>Hasta el día</span>
            <input type="date" name="endDate" />
          </label>
          <label className="field">
            <span>Hora (opcional)</span>
            <input type="time" name="endTime" />
          </label>
        </div>
        <label className="field">
          <span>Motivo</span>
          <input name="reason" placeholder="Vacaciones, curso…" />
        </label>
        <button className="btn">Agregar bloqueo</button>
      </form>
      {blocks.length === 0 ? (
        <div className="card empty">
          <p className="muted">No hay bloqueos próximos.</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Desde</th>
                <th>Hasta</th>
                <th>Motivo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.id}>
                  <td className="capitalize">{fmtDateTime(b.start)}</td>
                  <td className="capitalize">{fmtDateTime(b.end)}</td>
                  <td>{b.reason}</td>
                  <td style={{ textAlign: "right" }}>
                    <form action={deleteBlock}>
                      <input type="hidden" name="id" value={b.id} />
                      <ConfirmButton className="icon" title="¿Quitar este bloqueo?" text="Esos horarios volverán a estar disponibles." confirmText="Quitar">
                        ✕
                      </ConfirmButton>
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

import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { todayStr } from "@/lib/slots";
import { Notice } from "@/components/Notice";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BlockForm } from "@/components/BlockForm";
import { SP, str } from "@/lib/params";
import { deleteBlock } from "../actions";

export const metadata = { title: "Bloqueos" };

export default async function BlocksAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const blocks = await db.blockedTime.findMany({ where: { end: { gt: new Date() } }, orderBy: { start: "asc" } });
  const counts = await Promise.all(
    blocks.map((b) => db.booking.count({ where: { status: "CONFIRMED", start: { lt: b.end }, end: { gt: b.start } } })),
  );
  return (
    <>
      <Notice error={str(sp.error)} ok={str(sp.ok)} />
      <div className="admin-head">
        <div>
          <h1>Bloqueos</h1>
          <p className="muted">Vacaciones, feriados o pendientes. Si ya hay citas en ese rango te avisamos y decides si cancelarlas.</p>
        </div>
      </div>
      <div className="split">
        <BlockForm today={todayStr()} />
        <div>
          <h3 className="list-title">Próximos bloqueos</h3>
          {blocks.length === 0 ? (
            <div className="card empty">
              <p className="muted">No hay bloqueos próximos.</p>
            </div>
          ) : (
            blocks.map((b, i) => (
              <div key={b.id} className="card item-card">
                <div className="item-main">
                  <strong>{b.reason || "Bloqueo"}</strong>
                  <span className="muted small capitalize">Desde {fmtDateTime(b.start)}</span>
                  <span className="muted small capitalize">Hasta {fmtDateTime(b.end)}</span>
                  {counts[i] > 0 && (
                    <Link href={`/admin/reservas?vista=todas&estado=CONFIRMED&desde=${b.start.toISOString().slice(0, 10)}`} className="badge warn">
                      ⚠ {counts[i]} cita(s) dentro
                    </Link>
                  )}
                </div>
                <form action={deleteBlock}>
                  <input type="hidden" name="id" value={b.id} />
                  <ConfirmButton className="btn ghost small" title="¿Quitar este bloqueo?" text="Esos horarios volverán a estar disponibles." confirmText="Quitar">
                    Quitar
                  </ConfirmButton>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

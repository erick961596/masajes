import { db } from "@/lib/db";
import { Notice } from "@/components/Notice";
import { SP, str } from "@/lib/params";
import { saveService } from "../actions";

type S = { id?: string; name?: string; description?: string | null; durationMin?: number; priceCents?: number; active?: boolean };

function ServiceForm({ s, label }: { s: S; label: string }) {
  return (
    <form action={saveService} className={`card ${s.active === false ? "inactive" : ""}`}>
      {s.id && <input type="hidden" name="id" value={s.id} />}
      <div className="service-admin">
        <label className="field name">
          <span>Nombre</span>
          <input name="name" defaultValue={s.name} required placeholder="Masaje relajante" />
        </label>
        <label className="field">
          <span>Minutos</span>
          <input name="durationMin" type="number" min={5} max={600} step={5} defaultValue={s.durationMin ?? 60} required />
        </label>
        <label className="field">
          <span>Precio</span>
          <input name="price" type="number" min={0} step="0.01" defaultValue={s.priceCents != null ? s.priceCents / 100 : ""} required />
        </label>
      </div>
      <label className="field">
        <span>Descripción</span>
        <textarea name="description" rows={2} defaultValue={s.description ?? ""} placeholder="Qué incluye, para quién es…" />
      </label>
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <label className="check">
          <input type="checkbox" name="active" defaultChecked={s.active ?? true} /> Visible para clientes
        </label>
        <button className="btn">{label}</button>
      </div>
    </form>
  );
}

export default async function ServicesAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const services = await db.service.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return (
    <>
      <Notice error={str(sp.error)} ok={str(sp.ok)} />
      <div className="page-head">
        <h1>Servicios y precios</h1>
        <p className="muted">Lo que tus clientes pueden reservar. Desmarca “Visible” para ocultar un servicio sin borrarlo.</p>
      </div>
      <h2>Nuevo servicio</h2>
      <ServiceForm s={{}} label="Crear servicio" />
      {services.length > 0 && <h2>Tus servicios</h2>}
      {services.map((s) => (
        <ServiceForm key={s.id} s={s} label="Guardar" />
      ))}
    </>
  );
}

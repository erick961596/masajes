import { db } from "@/lib/db";
import { Notice, SP, str } from "@/components/Notice";
import { saveService } from "../actions";

type S = { id?: string; name?: string; description?: string | null; durationMin?: number; priceCents?: number; active?: boolean };

function ServiceForm({ s, label }: { s: S; label: string }) {
  return (
    <form action={saveService} className="card">
      {s.id && <input type="hidden" name="id" value={s.id} />}
      <div className="row">
        <label style={{ flex: 2, minWidth: 180 }}>
          Nombre
          <input name="name" defaultValue={s.name} required />
        </label>
        <label style={{ width: 110 }}>
          Minutos
          <input name="durationMin" type="number" min={5} max={600} step={5} defaultValue={s.durationMin ?? 60} required />
        </label>
        <label style={{ width: 130 }}>
          Precio
          <input name="price" type="number" min={0} step="0.01" defaultValue={s.priceCents != null ? s.priceCents / 100 : ""} required />
        </label>
      </div>
      <label>
        Descripción
        <textarea name="description" rows={2} defaultValue={s.description ?? ""} />
      </label>
      <div className="row" style={{ alignItems: "center" }}>
        <label style={{ flexDirection: "row", margin: 0 }}>
          <input type="checkbox" name="active" defaultChecked={s.active ?? true} /> Visible para clientes
        </label>
        <button>{label}</button>
      </div>
    </form>
  );
}

export default async function ServicesAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const services = await db.service.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return (
    <>
      <h1>Servicios y precios</h1>
      <Notice error={str(sp.error)} />
      <h2>Nuevo servicio</h2>
      <ServiceForm s={{}} label="Crear" />
      {services.length > 0 && <h2>Servicios existentes</h2>}
      {services.map((s) => (
        <ServiceForm key={s.id} s={s} label="Guardar" />
      ))}
    </>
  );
}

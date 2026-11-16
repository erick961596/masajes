import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { Notice } from "@/components/Notice";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SP, str } from "@/lib/params";
import { deleteService, saveService } from "../actions";

export const metadata = { title: "Servicios" };

type S = { id?: string; name?: string; description?: string | null; durationMin?: number; priceCents?: number; active?: boolean };

function ServiceForm({ s, label }: { s: S; label: string }) {
  return (
    <form action={saveService} className="service-form">
      {s.id && <input type="hidden" name="id" value={s.id} />}
      <label className="field">
        <span>Nombre</span>
        <input name="name" defaultValue={s.name} required placeholder="Masaje relajante" />
      </label>
      <div className="form-cols">
        <label className="field">
          <span>Duración (min)</span>
          <input name="durationMin" type="number" inputMode="numeric" min={5} max={600} step={5} defaultValue={s.durationMin ?? 60} required />
        </label>
        <label className="field">
          <span>Precio</span>
          <div className="input-prefix">
            <span>₡</span>
            <input name="price" inputMode="numeric" pattern="[0-9 .]*" defaultValue={s.priceCents ? Math.round(s.priceCents / 100) : ""} placeholder="0 = a consultar" />
          </div>
        </label>
      </div>
      <label className="field">
        <span>Descripción</span>
        <textarea name="description" rows={2} defaultValue={s.description ?? ""} placeholder="Qué incluye, para quién es…" />
      </label>
      <label className="switch">
        <input type="checkbox" name="active" defaultChecked={s.active ?? true} />
        <span className="track" aria-hidden />
        Visible para clientes
      </label>
      <button className="btn">{label}</button>
    </form>
  );
}

export default async function ServicesAdmin({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const services = await db.service.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], include: { _count: { select: { bookings: true } } } });
  return (
    <>
      <Notice error={str(sp.error)} ok={str(sp.ok)} />
      <div className="admin-head">
        <div>
          <h1>Servicios y precios</h1>
          <p className="muted">Precios en colones. Deja el precio vacío o en 0 para mostrar “Precio a consultar”.</p>
        </div>
      </div>
      <details className="card new-item">
        <summary className="btn">+ Nuevo servicio</summary>
        <ServiceForm s={{}} label="Crear servicio" />
      </details>
      <div className="svc-grid">
        {services.map((s) => (
          <article key={s.id} className={`card svc-card ${s.active ? "" : "inactive"}`}>
            <header>
              <h3>{s.name}</h3>
              {!s.active && <span className="badge past">Oculto</span>}
            </header>
            {s.description && <p className="muted small clamp">{s.description}</p>}
            <div className="svc-meta">
              <span className={s.priceCents ? "price" : "price tbd"}>{money(s.priceCents)}</span>
              <span className="chip">{s.durationMin} min</span>
            </div>
            <span className="muted small">{s._count.bookings} reserva(s) en total</span>
            <details className="svc-edit">
              <summary className="btn ghost small">Editar</summary>
              <ServiceForm s={s} label="Guardar cambios" />
              {s._count.bookings === 0 && (
                <form action={deleteService} className="svc-delete">
                  <input type="hidden" name="id" value={s.id} />
                  <ConfirmButton className="btn danger small" title={`¿Eliminar “${s.name}”?`} text="No tiene reservas, se borrará para siempre." confirmText="Eliminar">
                    Eliminar servicio
                  </ConfirmButton>
                </form>
              )}
            </details>
          </article>
        ))}
      </div>
    </>
  );
}

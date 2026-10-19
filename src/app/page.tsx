import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const services = await db.service.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <>
      <h1>Reserva tu sesión</h1>
      {services.length === 0 && <p className="muted">Aún no hay servicios disponibles.</p>}
      <div className="grid">
        {services.map((s) => (
          <div key={s.id} className="card">
            <h3>{s.name}</h3>
            {s.description && <p className="muted">{s.description}</p>}
            <p>
              {s.durationMin} min · <strong>{money(s.priceCents)}</strong>
            </p>
            <Link className="btn" href={`/reservar/${s.id}`}>
              Reservar
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}

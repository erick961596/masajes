import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Home() {
  const services = await db.service.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <>
      <section className="hero">
        <span className="hero-eyebrow">{config.businessName}</span>
        <h1>Tu momento para descansar empieza aquí</h1>
        <p className="lead">Elige tu masaje, aparta tu horario en segundos y recibe la confirmación en tu correo.</p>
        <Link className="btn" href="/reservar">
          Reservar mi cita
        </Link>
        <div className="hero-points">
          <span>✓ Confirmación inmediata</span>
          <span>✓ Reagenda o cancela en línea</span>
          <span>✓ Recordatorio por correo</span>
        </div>
      </section>

      <h2>Servicios</h2>
      {services.length === 0 && <p className="muted">Muy pronto publicaremos nuestros servicios.</p>}
      <div className="grid">
        {services.map((s) => (
          <div key={s.id} className="card service-card">
            <h3>{s.name}</h3>
            {s.description && <p className="muted">{s.description}</p>}
            <div className="spacer" />
            <div className="service-meta">
              <span className="chip">{s.durationMin} min</span>
              <span className="price">{money(s.priceCents)}</span>
            </div>
            <Link className="btn ghost" href={`/reservar?servicio=${s.id}`}>
              Reservar
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { config } from "@/lib/config";
import { SocialIcon } from "@/components/SocialIcon";

export const dynamic = "force-dynamic";

export default async function Home() {
  const services = await db.service.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <>
      <section className="intro">
        <div>
          <h1>{config.businessName}</h1>
          <p>Masajes y terapias. Elige el servicio y la hora; la confirmación te llega al correo y puedes reagendar o cancelar desde tu cuenta.</p>
          <div className="facts">
            <span>
              <strong>{services.length}</strong> servicios
            </span>
            <span>Reagenda o cancela en línea</span>
          </div>
        </div>
        <div className="intro-actions">
          <Link className="btn" href="/reservar">
            Reservar cita
          </Link>
          <a className="btn ghost wa-link" href={config.whatsapp.url} target="_blank" rel="noreferrer">
            <SocialIcon name="WhatsApp" size={16} /> Escribir
          </a>
        </div>
      </section>

      <h2>Servicios y precios</h2>
      {services.length === 0 ? (
        <p className="muted">Muy pronto publicaremos nuestros servicios.</p>
      ) : (
        <ul className="menu">
          {services.map((s) => (
            <li key={s.id}>
              <span className="menu-name">
                {s.name}
                {s.description && <span className="menu-desc">{s.description}</span>}
              </span>
              <span className="menu-dur">{s.durationMin} min</span>
              <span className={s.priceCents ? "menu-price" : "menu-price tbd"}>{money(s.priceCents)}</span>
              <Link className="btn ghost small" href={`/reservar?servicio=${s.id}`}>
                Reservar
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

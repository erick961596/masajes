import { formatInTimeZone } from "date-fns-tz";
import { mailMode } from "@/lib/mail";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { TestMail } from "@/components/TestMail";

export const metadata = { title: "Correo" };

export default async function MailAdmin() {
  const admin = await requireAdmin();
  const { mode, host } = mailMode();
  const label = mode === "ethereal" ? ["warn", "Modo prueba (Ethereal)"] : ["", mode === "mailtrap" ? "Mailtrap (envío real)" : "SMTP"];
  const logs = await db.mailLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
  return (
    <div className="medium">
      <div className="admin-head">
        <div>
          <h1>Correo</h1>
          <p className="muted">Los clientes reciben correo al reservar, reagendar o cancelar. Tú recibes copia en {config.adminEmail || "ADMIN_EMAIL"}.</p>
        </div>
      </div>
      <div className="card">
        <dl className="kv">
          <dt>Estado</dt>
          <dd>
            <span className={`badge ${label[0]}`}>{label[1]}</span>
          </dd>
          <dt>Servidor</dt>
          <dd>{host || "—"}</dd>
        </dl>
        {mode === "ethereal" ? (
          <p className="muted small" style={{ marginTop: 12 }}>
            No hay token de Mailtrap configurado (<code>MAILTRAP_TOKEN</code>), así que los correos van a una cuenta de prueba de Ethereal y <strong>no llegan a nadie</strong>. Ábrelos desde la lista de abajo con “Ver correo”.
          </p>
        ) : (
          <p className="muted small" style={{ marginTop: 12 }}>
            Los correos salen por Mailtrap desde <code>{process.env.MAIL_FROM || "MAIL_FROM"}</code>. Si un envío falla, el motivo aparece en la lista de abajo (lo más común: el dominio del remitente no está verificado en Mailtrap).
          </p>
        )}
        <TestMail defaultTo={admin.email} />
      </div>

      <h3 className="list-title">Últimos correos</h3>
      <div className="card list-card">
        {logs.length === 0 && <p className="muted empty">Aún no se ha enviado ningún correo.</p>}
        {logs.map((l) => (
          <div key={l.id} className="mail-row">
            <div className="client-main">
              <strong className="mail-subject">{l.subject}</strong>
              <span className="muted small">
                Para {l.to} · {formatInTimeZone(l.createdAt, config.tz, "dd/MM HH:mm")}
              </span>
              {l.error && <span className={`small ${l.ok ? "muted" : "error-text"}`}>{l.error}</span>}
            </div>
            {l.previewUrl ? (
              <a className="btn ghost small" href={l.previewUrl} target="_blank" rel="noreferrer">
                Ver correo
              </a>
            ) : (
              <span className={`badge ${l.ok ? "" : "cancelled"}`}>{l.ok ? "Enviado" : "Falló"}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

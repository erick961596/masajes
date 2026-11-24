import { formatInTimeZone } from "date-fns-tz";
import { mailMode } from "@/lib/mail";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSetting, NOTIFY_EMAILS } from "@/lib/settings";
import { TestMail } from "@/components/TestMail";
import { NotifyEmailsForm } from "@/components/NotifyEmailsForm";

export const metadata = { title: "Configuración" };

export default async function SettingsAdmin() {
  const admin = await requireAdmin();
  const { mode, host } = mailMode();
  const [saved, logs] = await Promise.all([getSetting(NOTIFY_EMAILS), db.mailLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 })]);
  const current = saved ?? config.adminEmail;
  const modeLabel = mode === "ethereal" ? "Modo prueba (Ethereal): los correos no llegan a nadie" : mode === "mailtrap" ? "Mailtrap, envío real" : "SMTP";

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Configuración</h1>
          <p className="muted">Notificaciones y estado del correo.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Notificaciones de reservas</h2>
        </div>
        <p className="muted small">
          Estos correos reciben copia cada vez que un cliente reserva, reagenda o cancela. Sepáralos con coma. El cliente siempre recibe su propio correo.
          {saved === null && config.adminEmail && " Aún no se ha guardado nada, así que por ahora se usa ADMIN_EMAIL."}
        </p>
        <NotifyEmailsForm initial={current} />
      </section>

      <section className="panel" id="correo">
        <div className="panel-head">
          <h2>Envío de correo</h2>
          <span className={`tag ${mode === "ethereal" ? "tag-warn" : "tag-ok"}`}>{modeLabel}</span>
        </div>
        <dl className="kv">
          <dt>Servidor</dt>
          <dd>{host || "—"}</dd>
          <dt>Remitente</dt>
          <dd>{process.env.MAIL_FROM || `${config.businessName} <reservas@anispa.test>`}</dd>
        </dl>
        {mode === "ethereal" && (
          <p className="muted small">
            Falta <code>MAILTRAP_TOKEN</code> en las variables de entorno. Mientras tanto, abre cada correo desde “Ver” en la lista.
          </p>
        )}
        <TestMail defaultTo={admin.email} />
      </section>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Para</th>
              <th>Asunto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="muted empty">
                  Aún no se ha enviado ningún correo.
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id}>
                <td data-label="Fecha" className="muted nowrap">
                  {formatInTimeZone(l.createdAt, config.tz, "dd/MM HH:mm")}
                </td>
                <td data-label="Para" className="break">
                  {l.to}
                </td>
                <td data-label="Asunto">
                  {l.subject}
                  {l.error && <div className={`small ${l.ok ? "muted" : "error-text"}`}>{l.error}</div>}
                </td>
                <td data-label="Estado">
                  {l.previewUrl ? (
                    <a href={l.previewUrl} target="_blank" rel="noreferrer">
                      Ver
                    </a>
                  ) : (
                    <span className={`tag ${l.ok ? "tag-ok" : "tag-bad"}`}>{l.ok ? "Enviado" : "Falló"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

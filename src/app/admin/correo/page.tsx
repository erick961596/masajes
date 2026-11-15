import { mailMode } from "@/lib/mail";
import { config } from "@/lib/config";
import { requireAdmin } from "@/lib/auth";
import { TestMail } from "@/components/TestMail";

export const metadata = { title: "Correo" };

export default async function MailAdmin() {
  const admin = await requireAdmin();
  const { mode, host } = mailMode();
  const label = { off: ["cancelled", "Sin configurar"], ethereal: ["warn", "Modo prueba (Ethereal)"], smtp: ["", "Conectado"] }[mode];
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
          <dt>Remitente</dt>
          <dd>{process.env.MAIL_FROM || "—"}</dd>
        </dl>
        {mode === "ethereal" && (
          <p className="muted small">
            Ethereal no entrega correos reales: cada envío genera un enlace de vista previa (te lo mostramos al enviar y queda en los logs).
          </p>
        )}
        {mode === "off" && <p className="muted small">Agrega SMTP_HOST y compañía en las variables de entorno. Con SMTP_HOST=&quot;ethereal&quot; funciona sin crear cuenta.</p>}
        <TestMail defaultTo={admin.email} />
      </div>
    </div>
  );
}

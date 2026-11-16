import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { colones, fmtDateTime, fmtTime, PAYMENT_METHODS, statusBadge } from "@/lib/format";
import { bookingFormData } from "@/lib/adminData";
import { todayStr } from "@/lib/slots";
import { SP, str } from "@/lib/params";
import { Notice } from "@/components/Notice";
import { ConfirmButton } from "@/components/ConfirmButton";
import { AdminBookingForm } from "@/components/AdminBookingForm";
import { setBookingStatus } from "../../actions";

export const metadata = { title: "Reserva" };

export default async function AdminBookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const b = await db.booking.findUnique({ where: { id }, include: { service: true, user: true } });
  if (!b) notFound();
  const data = await bookingFormData();
  const { services } = data;
  const clients = data.clients.some((c) => c.id === b.userId)
    ? data.clients
    : [{ id: b.user.id, name: b.user.name, email: b.user.email, phone: b.user.phone }, ...data.clients];
  const [cls, label] = statusBadge(b.status, b.start, true);
  const visits = await db.booking.count({ where: { userId: b.userId, status: { in: ["COMPLETED", "CONFIRMED"] } } });
  const here = `/admin/reservas/${b.id}`;

  const quick = (status: string, text: string, kind = "ghost", confirm?: string) => (
    <form action={setBookingStatus}>
      <input type="hidden" name="id" value={b.id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="back" value={here} />
      {status === "CANCELLED" && <input type="hidden" name="notify" value="on" />}
      {confirm ? (
        <ConfirmButton className={`btn small ${kind}`} title={confirm} text="Se liberará el horario y se le avisará al cliente por correo." confirmText="Sí, cancelar">
          {text}
        </ConfirmButton>
      ) : (
        <button className={`btn small ${kind}`}>{text}</button>
      )}
    </form>
  );

  return (
    <div className="medium">
      <Notice error={str(sp.error)} ok={str(sp.ok)} />
      <p>
        <Link href="/admin/reservas">← Reservas</Link>
      </p>
      <div className="card booking-hero">
        <span>
          <span className={`badge ${cls}`}>{label}</span>
        </span>
        <h1>{b.service.name}</h1>
        <span className="booking-when capitalize">
          {fmtDateTime(b.start)} – {fmtTime(b.end)}
        </span>
        <dl className="kv">
          <dt>Cliente</dt>
          <dd>
            <Link href={`/admin/clientes?q=${encodeURIComponent(b.user.email)}`}>{b.user.name}</Link> · {visits} cita(s)
            <div className="muted small">
              <a href={`mailto:${b.user.email}`}>{b.user.email}</a>
              {b.user.phone && (
                <>
                  {" · "}
                  <a href={`https://wa.me/${b.user.phone.replace(/\D/g, "").replace(/^(\d{8})$/, "506$1")}`} target="_blank" rel="noreferrer">
                    WhatsApp {b.user.phone}
                  </a>
                </>
              )}
            </div>
          </dd>
          <dt>Precio</dt>
          <dd>
            {colones(b.priceCents)}
            {b.paymentMethod ? ` · ${b.paymentMethod}` : ""}
          </dd>
          {b.notes && (
            <>
              <dt>Notas</dt>
              <dd>{b.notes}</dd>
            </>
          )}
          <dt>Folio</dt>
          <dd>
            <code>{b.id}</code>
          </dd>
        </dl>
        <div className="quick-actions">
          {b.status !== "COMPLETED" && quick("COMPLETED", "✓ Realizada")}
          {b.status !== "NO_SHOW" && b.start <= new Date() && quick("NO_SHOW", "No asistió")}
          {b.status !== "CONFIRMED" && quick("CONFIRMED", "Volver a confirmada")}
          {b.status !== "CANCELLED" && quick("CANCELLED", "Cancelar cita", "danger", "¿Cancelar esta cita?")}
        </div>
      </div>

      <h2>Editar o reagendar</h2>
      <AdminBookingForm
        clients={clients}
        services={services}
        paymentMethods={PAYMENT_METHODS}
        today={todayStr()}
        initial={{
          id: b.id,
          userId: b.userId,
          serviceId: b.serviceId,
          date: formatInTimeZone(b.start, config.tz, "yyyy-MM-dd"),
          time: formatInTimeZone(b.start, config.tz, "HH:mm"),
          priceCents: b.priceCents,
          status: b.status,
          paymentMethod: b.paymentMethod,
          notes: b.notes,
        }}
      />
      <p className="muted small" style={{ marginTop: 16 }}>
        Creada el {formatInTimeZone(b.createdAt, config.tz, "dd/MM/yyyy HH:mm")} · última modificación {formatInTimeZone(b.updatedAt, config.tz, "dd/MM/yyyy HH:mm")}
      </p>
    </div>
  );
}

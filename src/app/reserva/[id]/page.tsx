import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime, money } from "@/lib/format";
import { SP, str } from "@/lib/params";
import { Notice } from "@/components/Notice";
import { ConfirmButton } from "@/components/ConfirmButton";
import { cancelBooking } from "@/app/actions";

export const metadata = { title: "Tu reserva" };

const okMsg: Record<string, string> = {
  reagendada: "Listo, tu cita se reagendó",
  cancelada: "Tu cita se canceló",
};

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/reserva/${id}`);
  const b = await db.booking
    .findUnique({ where: { id }, include: { service: true, user: { select: { name: true, email: true, phone: true } } } })
    .catch(() => null);
  if (!b || (b.userId !== user.id && user.role !== "ADMIN")) notFound();
  const upcoming = b.start > new Date();
  const editable = b.status === "CONFIRMED" && upcoming;
  const badge = b.status === "CANCELLED" ? ["cancelled", "Cancelada"] : upcoming ? ["", "Confirmada"] : ["past", "Realizada"];

  return (
    <div className="medium">
      <Notice error={str(sp.error)} ok={okMsg[str(sp.ok) || ""]} />
      <p>
        <Link href={user.role === "ADMIN" && b.userId !== user.id ? "/admin" : "/cuenta"}>← Volver</Link>
      </p>
      <div className="card booking-hero">
        <span>
          <span className={`badge ${badge[0]}`}>{badge[1]}</span>
        </span>
        <h1>{b.service.name}</h1>
        <span className="booking-when capitalize">{fmtDateTime(b.start)}</span>
        <dl className="kv">
          <dt>Duración</dt>
          <dd>{b.service.durationMin} min</dd>
          <dt>Precio</dt>
          <dd>{money(b.priceCents)}</dd>
          {user.role === "ADMIN" && (
            <>
              <dt>Cliente</dt>
              <dd>
                {b.user.name} · <a href={`mailto:${b.user.email}`}>{b.user.email}</a>
                {b.user.phone ? ` · ${b.user.phone}` : ""}
              </dd>
            </>
          )}
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
      </div>
      {editable && (
        <div className="row">
          <Link className="btn" href={`/reserva/${b.id}/reagendar`}>
            Reagendar
          </Link>
          <form action={cancelBooking}>
            <input type="hidden" name="id" value={b.id} />
            <ConfirmButton className="btn danger" title="¿Cancelar esta cita?" text="Se liberará el horario y te avisaremos por correo." confirmText="Sí, cancelar">
              Cancelar cita
            </ConfirmButton>
          </form>
        </div>
      )}
    </div>
  );
}

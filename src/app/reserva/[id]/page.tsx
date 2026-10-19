import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDateTime, money } from "@/lib/format";
import { Notice, SP, str } from "@/components/Notice";
import { cancelBooking } from "@/app/actions";

const okMsg: Record<string, string> = {
  creada: "¡Listo! Tu reserva está confirmada. Te enviamos un correo con los detalles.",
  reagendada: "Tu reserva se reagendó. Te enviamos un correo con el nuevo horario.",
  cancelada: "Tu reserva se canceló.",
};

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/reserva/${id}`);
  const b = await db.booking
    .findUnique({ where: { id }, include: { service: true, user: { select: { name: true, email: true, phone: true } } } })
    .catch(() => null);
  if (!b || (b.userId !== user.id && user.role !== "ADMIN")) notFound();
  const editable = b.status === "CONFIRMED" && b.start > new Date();

  return (
    <div className="narrow">
      <h1>Tu reserva</h1>
      <Notice error={str(sp.error)} ok={okMsg[str(sp.ok) || ""]} />
      <div className="card">
        <h3>{b.service.name}</h3>
        <p className="capitalize">{fmtDateTime(b.start)}</p>
        <p>
          {b.service.durationMin} min · {money(b.priceCents)}
        </p>
        <p>
          Estado: <span className={`badge ${b.status === "CANCELLED" ? "cancelled" : ""}`}>{b.status === "CANCELLED" ? "Cancelada" : "Confirmada"}</span>
        </p>
        {user.role === "ADMIN" && (
          <p className="muted">
            Cliente: {b.user.name} · {b.user.email}
            {b.user.phone ? ` · ${b.user.phone}` : ""}
          </p>
        )}
        {b.notes && <p className="muted">Notas: {b.notes}</p>}
        <p className="muted">
          Folio: <code>{b.id}</code>
        </p>
      </div>
      {editable && (
        <div className="row">
          <Link className="btn" href={`/reserva/${b.id}/reagendar`}>
            Reagendar
          </Link>
          <form action={cancelBooking}>
            <input type="hidden" name="id" value={b.id} />
            <button className="danger">Cancelar reserva</button>
          </form>
        </div>
      )}
    </div>
  );
}

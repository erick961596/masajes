import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { upcomingDays } from "@/lib/days";
import { SP, str } from "@/lib/params";
import { BookingWizard } from "@/components/BookingWizard";

export const metadata = { title: "Reservar" };

export default async function ReservarPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [user, services, days] = await Promise.all([
    getUser(),
    db.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    upcomingDays(28),
  ]);
  return (
    <div className="medium">
      <div className="page-head">
        <h1>Reserva tu cita</h1>
        <p className="muted">Cuatro pasos y listo.</p>
      </div>
      <BookingWizard
        services={services.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMin: s.durationMin, price: money(s.priceCents) }))}
        days={days}
        initialServiceId={str(sp.servicio)}
        user={user ? { name: user.name, email: user.email } : null}
      />
    </div>
  );
}

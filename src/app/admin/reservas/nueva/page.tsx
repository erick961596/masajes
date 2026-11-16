import Link from "next/link";
import { AdminBookingForm } from "@/components/AdminBookingForm";
import { bookingFormData } from "@/lib/adminData";
import { PAYMENT_METHODS } from "@/lib/format";
import { todayStr } from "@/lib/slots";
import { SP, str } from "@/lib/params";

export const metadata = { title: "Nueva reserva" };

export default async function NewBooking({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { clients, services } = await bookingFormData();
  return (
    <div className="medium">
      <p>
        <Link href="/admin/reservas">← Reservas</Link>
      </p>
      <div className="page-head">
        <h1>Nueva reserva</h1>
        <p className="muted">Agenda una cita para un cliente que te escribió por WhatsApp, llamó o llegó al spa.</p>
      </div>
      <AdminBookingForm clients={clients} services={services} paymentMethods={PAYMENT_METHODS} today={todayStr()} presetClientId={str(sp.cliente)} />
    </div>
  );
}

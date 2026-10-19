import { redirect } from "next/navigation";

export default async function OldBookRoute({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  redirect(`/reservar?servicio=${encodeURIComponent(serviceId)}`);
}

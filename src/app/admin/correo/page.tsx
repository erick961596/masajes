import { redirect } from "next/navigation";

export default function MailAdmin() {
  redirect("/admin/configuracion#correo");
}

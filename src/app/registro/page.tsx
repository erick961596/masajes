import Link from "next/link";
import { Notice } from "@/components/Notice";
import { SP, str } from "@/lib/params";
import { register } from "../actions";

export const metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = str(sp.next) || "/cuenta";
  return (
    <div className="narrow">
      <Notice error={str(sp.error)} />
      <div className="page-head">
        <h1>Crea tu cuenta</h1>
        <p className="muted">Para reservar y gestionar tus citas.</p>
      </div>
      <form action={register} className="card form-grid">
        <input type="hidden" name="next" value={next} />
        <label className="field">
          <span>Nombre</span>
          <input name="name" required autoComplete="name" />
        </label>
        <label className="field">
          <span>Correo</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="field">
          <span>Teléfono (opcional)</span>
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <button className="btn">Crear cuenta</button>
      </form>
      <p className="muted">
        ¿Ya tienes cuenta? <Link href={`/login?next=${encodeURIComponent(next)}`}>Entra</Link>
      </p>
    </div>
  );
}

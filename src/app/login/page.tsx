import Link from "next/link";
import { Notice } from "@/components/Notice";
import { SP, str } from "@/lib/params";
import { login } from "../actions";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = str(sp.next) || "/cuenta";
  return (
    <div className="narrow">
      <Notice error={str(sp.error)} />
      <div className="page-head">
        <h1>Hola de nuevo</h1>
        <p className="muted">Entra para ver y gestionar tus citas.</p>
      </div>
      <form action={login} className="card form-grid">
        <input type="hidden" name="next" value={next} />
        <label className="field">
          <span>Correo</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button className="btn">Entrar</button>
      </form>
      <p className="muted">
        ¿No tienes cuenta? <Link href={`/registro?next=${encodeURIComponent(next)}`}>Crea una</Link>
      </p>
    </div>
  );
}

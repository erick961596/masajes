import Link from "next/link";
import { Notice, SP, str } from "@/components/Notice";
import { login } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = str(sp.next) || "/cuenta";
  return (
    <div className="narrow">
      <h1>Entrar</h1>
      <Notice error={str(sp.error)} />
      <form action={login} className="card">
        <input type="hidden" name="next" value={next} />
        <label>
          Correo
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button>Entrar</button>
      </form>
      <p>
        ¿No tienes cuenta? <Link href={`/registro?next=${encodeURIComponent(next)}`}>Crea una</Link>
      </p>
    </div>
  );
}

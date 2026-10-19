import Link from "next/link";
import { Notice, SP, str } from "@/components/Notice";
import { register } from "../actions";

export default async function RegisterPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = str(sp.next) || "/cuenta";
  return (
    <div className="narrow">
      <h1>Crear cuenta</h1>
      <Notice error={str(sp.error)} />
      <form action={register} className="card">
        <input type="hidden" name="next" value={next} />
        <label>
          Nombre
          <input name="name" required autoComplete="name" />
        </label>
        <label>
          Correo
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Teléfono (opcional)
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <button>Crear cuenta</button>
      </form>
      <p>
        ¿Ya tienes cuenta? <Link href={`/login?next=${encodeURIComponent(next)}`}>Entra</Link>
      </p>
    </div>
  );
}

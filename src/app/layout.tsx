import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { logout } from "./actions";
import "./globals.css";

export const metadata: Metadata = { title: config.businessName, description: "Reserva tu sesión en línea" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="es">
      <body>
        <header className="top">
          <Link href="/" className="brand">
            {config.businessName}
          </Link>
          <nav>
            <Link href="/">Servicios</Link>
            {user ? (
              <>
                <Link href="/cuenta">Mis reservas</Link>
                {user.role === "ADMIN" && <Link href="/admin">Admin</Link>}
                <form action={logout}>
                  <button className="link">Salir</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login">Entrar</Link>
                <Link href="/registro">Crear cuenta</Link>
              </>
            )}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

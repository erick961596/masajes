import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { logout } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: config.businessName, template: `%s · ${config.businessName}` },
  description: "Reserva tu masaje en línea en minutos.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=DM+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <header className="top">
          <div className="top-inner">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden>
                ❀
              </span>
              {config.businessName}
            </Link>
            <nav>
              <Link href="/reservar" className="nav-cta">
                Reservar
              </Link>
              {user ? (
                <>
                  <Link href="/cuenta">Mis citas</Link>
                  {user.role === "ADMIN" && <Link href="/admin">Admin</Link>}
                  <form action={logout}>
                    <button className="link">Salir</button>
                  </form>
                </>
              ) : (
                <Link href="/login">Entrar</Link>
              )}
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="foot">
          © {new Date().getFullYear()} {config.businessName}
        </footer>
      </body>
    </html>
  );
}

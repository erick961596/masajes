# Reservas de masajes (MVP)

App web para reservar sesiones de masaje y otros servicios.

- **Clientes**: crean cuenta (correo + contraseña), eligen servicio, día y horario, y desde *Mis reservas* pueden ver, reagendar o cancelar.
- **Admin**: agenda semanal, servicios con duración y precio, horario semanal (varios rangos por día) y bloqueos (días u horas).
- Cada reserva tiene un **UUID** (folio) y una página `/reserva/<uuid>`.
- **Correos** (Nodemailer por SMTP, pensado para Mailtrap) al cliente y al admin al crear, reagendar y cancelar.
- Se asume una sola persona atendiendo: dos reservas no pueden encimarse, aunque sean de servicios distintos. La comprobación se hace en una transacción serializable.

Stack: Next.js 16 (App Router, TypeScript), Prisma 6 + Postgres, sesiones con cookie firmada (jose) y bcrypt.

## Desarrollo local

```bash
cp .env.example .env   # y rellena los valores
npm install
npx prisma migrate deploy
npm run dev
```

El primer usuario que se registre con el correo de `ADMIN_EMAIL` queda como administrador. Después entra a **Admin → Horarios** y **Servicios** para que los clientes vean horarios disponibles.

## Desplegar en Netlify

1. En Netlify: *Add new site → Import from Git* y elige este repositorio. El `netlify.toml` ya define el build (`npm run build:netlify`, que aplica migraciones y compila).
2. Base de datos: activa **Netlify DB** (Neon) o crea un proyecto en neon.tech.
3. Variables de entorno (*Site configuration → Environment variables*):

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | URL de Postgres *pooled* |
| `DIRECT_URL` | URL de Postgres *directa / unpooled* (para migraciones). Con Netlify DB: el valor de `NETLIFY_DATABASE_URL_UNPOOLED` |
| `AUTH_SECRET` | cadena aleatoria larga (`openssl rand -base64 32`) |
| `ADMIN_EMAIL` | tu correo de admin |
| `APP_URL` | `https://tu-subdominio.tudominio.com` |
| `BUSINESS_TZ` | p. ej. `America/Costa_Rica` (por defecto) |
| `CURRENCY` | opcional, por defecto `CRC` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | credenciales SMTP de Mailtrap |
| `MAIL_FROM` | remitente, p. ej. `Masajes <reservas@tudominio.com>` (en Mailtrap Sending el dominio debe estar verificado) |

4. Subdominio: *Domain management → Add a domain* → `citas.tudominio.com`. En tu DNS crea un `CNAME` de `citas` a `<tu-sitio>.netlify.app`. Netlify emite el certificado HTTPS solo.

Si SMTP no está configurado, la app funciona igual y deja el aviso en los logs en lugar de enviar el correo.

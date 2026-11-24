# Reservas de masajes (MVP)

App web para reservar sesiones de masaje y otros servicios.

- **Clientes**: crean cuenta (correo + contraseña), eligen servicio, día y horario, y desde *Mis reservas* pueden ver, reagendar o cancelar.
- **Admin** (apto para celular): agenda semanal, gestión completa de reservas (buscar, filtrar, crear para un cliente, editar, reagendar, cancelar, estados Confirmada / Realizada / No asistió / Cancelada, método de pago), clientes, dashboard de ganancias (día, semana, mes, año o rango; por servicio, método de pago, día y cliente), servicios con precio en colones, horario semanal y bloqueos que avisan si ya hay citas en ese rango.
- Los clientes creados por el admin no tienen contraseña: cuando se registran con su mismo correo, reclaman la cuenta y ven sus citas.
- Cada reserva tiene un **UUID** (folio) y una página `/reserva/<uuid>`.
- **Correos** (Nodemailer por SMTP de Mailtrap; sin token cae a modo prueba con Ethereal) al cliente y al admin al crear, reagendar y cancelar.
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
| `MAILTRAP_TOKEN` | API token de Mailtrap (Email Sending, `live.smtp.mailtrap.io:587`, usuario `api`). Sin él: modo prueba con Ethereal |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | opcionales, para otro servidor (p. ej. Sandbox de Mailtrap) |
| `MAIL_FROM` | remitente, p. ej. `Masajes <reservas@tudominio.com>` (en Mailtrap Sending el dominio debe estar verificado) |

4. Subdominio: *Domain management → Add a domain* → `citas.tudominio.com`. En tu DNS crea un `CNAME` de `citas` a `<tu-sitio>.netlify.app`. Netlify emite el certificado HTTPS solo.

Correo: con `MAILTRAP_TOKEN` los correos salen de verdad por Mailtrap. Sin token, van a una cuenta de prueba de Ethereal (no llegan a nadie). En **Admin → Correo** ves el estado, cada envío (y su error si falló) y puedes mandar uno de prueba.

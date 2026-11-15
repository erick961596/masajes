-- Nuevos estados de reserva, método de pago y clientes creados por el admin (sin contraseña).
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';
ALTER TABLE "Booking" ADD COLUMN "paymentMethod" TEXT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

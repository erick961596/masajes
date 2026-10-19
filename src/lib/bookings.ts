import { Prisma } from "@prisma/client";
import { db } from "./db";
import { isSlotAvailable } from "./slots";

export class SlotTakenError extends Error {}

/**
 * Crea o mueve una reserva comprobando dentro de una transacción serializable
 * que nadie más haya tomado el horario.
 */
export async function reserveSlot(opts: {
  start: Date;
  durationMin: number;
  excludeBookingId?: string;
  write: (tx: Prisma.TransactionClient, end: Date) => Promise<{ id: string }>;
}) {
  const end = new Date(opts.start.getTime() + opts.durationMin * 60_000);
  if (!(await isSlotAvailable(opts.start, opts.durationMin, opts.excludeBookingId))) throw new SlotTakenError();
  try {
    return await db.$transaction(
      async (tx) => {
        const clash = await tx.booking.count({
          where: {
            status: "CONFIRMED",
            start: { lt: end },
            end: { gt: opts.start },
            ...(opts.excludeBookingId ? { id: { not: opts.excludeBookingId } } : {}),
          },
        });
        if (clash > 0) throw new SlotTakenError();
        return opts.write(tx, end);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") throw new SlotTakenError();
    throw err;
  }
}

export const bookingInclude = {
  service: { select: { name: true, durationMin: true } },
  user: { select: { name: true, email: true } },
} as const;

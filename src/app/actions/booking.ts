"use server";

import { PrismaClient, BookingStatus, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Creates a new Booking with status PENDING_PAYMENT.
 * Catches the Prisma unique constraint violation (P2002) to handle duplicate booking attempts gracefully.
 */
export async function createPendingBooking(
  studentId: string,
  trialClassId: string
) {
  try {
    const booking = await prisma.booking.create({
      data: {
        studentId,
        trialClassId,
        status: BookingStatus.PENDING_PAYMENT,
      },
    });

    return { success: true, booking };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "A booking for this student and class already exists.",
      };
    }

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create booking.",
    };
  }
}

/**
 * CRITICAL last-seat race handler using Prisma interactive transaction.
 */
export async function confirmPayment(bookingId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      // a. Fetch the current booking and its related trialClass
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          trialClass: true,
        },
      });

      if (!booking || !booking.trialClass) {
        return {
          success: false,
          message: "Booking or trial class not found.",
        };
      }

      // Lock the TrialClass row to serialize concurrent transactions during race conditions
      await tx.$queryRaw`SELECT id FROM "TrialClass" WHERE id = ${booking.trialClassId} FOR UPDATE`;

      // b. Count how many bookings for this trialClassId currently have the CONFIRMED status
      const confirmedCount = await tx.booking.count({
        where: {
          trialClassId: booking.trialClassId,
          status: BookingStatus.CONFIRMED,
        },
      });

      // c. RACE CONDITION CHECK: If the count is >= trialClass.capacity
      if (confirmedCount >= booking.trialClass.capacity) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.PAYMENT_FAILED },
        });

        await tx.paymentAttempt.create({
          data: {
            bookingId: booking.id,
            status: "FAILED",
          },
        });

        return {
          success: false,
          message: "Class reached maximum capacity during payment.",
        };
      }

      // d. If the count is < trialClass.capacity
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CONFIRMED },
      });

      await tx.paymentAttempt.create({
        data: {
          bookingId: booking.id,
          status: "SUCCESS",
        },
      });

      return { success: true };
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Payment confirmation failed.",
    };
  }
}

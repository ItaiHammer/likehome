"use server";

import { cancelReservation } from "@/utils/reservations";
import { getUserId } from "@/utils/user";

export type CancelResult =
  | { status: "cancelled"; refund: number; refundPoints: number }
  | { status: "signedOut" }
  | { status: "failed"; message: string };

const TRY_AGAIN = "We couldn’t cancel your reservation. Try again.";

// Anyone can call a server action with any arguments. cancel_reservation only touches the caller's
// own booking (auth.uid()), refuses once check-in has passed, and works out the refund and points itself.
export async function cancelBooking(reservationId: unknown): Promise<CancelResult> {
  const { userId } = await getUserId();
  if (!userId) return { status: "signedOut" };
  if (typeof reservationId !== "string") return { status: "failed", message: TRY_AGAIN };

  const { data, error } = await cancelReservation(reservationId);
  if (error?.code === "P0001") return { status: "failed", message: "This reservation can no longer be cancelled." };
  if (error || !data) {
    console.error("cancelReservation failed:", error);
    return { status: "failed", message: TRY_AGAIN };
  }

  const row = data as { refund?: unknown; refund_points?: unknown };
  return { status: "cancelled", refund: Number(row.refund) || 0, refundPoints: Number(row.refund_points) || 0 };
}

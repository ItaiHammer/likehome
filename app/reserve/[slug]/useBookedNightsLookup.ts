import { useEffect, useState } from "react";
import { outsideWindow, type BookedWindow } from "@/lib/room-availability";
import { MAX_NIGHTS } from "@/utils/reservation-logic";
import { createClient } from "@/utils/supabase/client";
import { nightsBetween } from "../../_components/dates";

type Row = { room_id: string; night: string };
const NONE: Row[] = [];

/**
 * The page looked up booked nights for about the next 400 days. Dates after that are looked up for
 * those exact nights here, so a room booked then isn't shown as free. `rows` are the extra booked
 * nights for the current dates; `lookingUp` is true until they've arrived.
 */
export function useBookedNightsLookup(hotelId: string, window: BookedWindow | undefined, checkIn: string, checkOut: string, enabled = true) {
  const nights = nightsBetween(checkIn, checkOut);
  const key =
    enabled && nights > 0 && nights <= MAX_NIGHTS && outsideWindow(window, checkIn, checkOut) ? `${checkIn}|${checkOut}` : "";
  const [found, setFound] = useState<{ key: string; rows: Row[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const [from, to] = key.split("|");
    createClient()
      .rpc("get_booked_nights", { p_hotel_id: hotelId, p_from: from, p_to: to })
      .then(
        ({ data, error }) => {
          if (error) console.error("get_booked_nights failed:", error.message);
          // A failed lookup doesn't block anything: the database still refuses a booked room
          if (!cancelled) setFound({ key, rows: (data ?? []) as Row[] });
        },
        () => {
          if (!cancelled) setFound({ key, rows: [] });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [key, hotelId]);

  const current = key !== "" && found?.key === key;
  return { rows: current ? found.rows : NONE, lookingUp: key !== "" && !current };
}

import { Button } from "@/app/_components/ui";
import { PAGE_ROUTES } from "@/constants/routes";

/** Return to the listing so guests can select current dates, rooms, and prices. */
export function RebookButton({
  hotelId,
  hotelName,
  sample = false,
}: {
  hotelId?: string | null;
  hotelName: string;
  sample?: boolean;
}) {
  // Local sample bookings have no real listing ID. Direct them to a search,
  // never to a fabricated /reserve/<id> page.
  const href = !sample && hotelId
    ? `/reserve/${encodeURIComponent(hotelId)}`
    : `${PAGE_ROUTES.SEARCH}?${new URLSearchParams({ where: hotelName })}`;

  return (
    <Button href={href} variant="primary" aria-label={`Book again at ${hotelName}`}>
      Book again
    </Button>
  );
}

// A bookable room type at a hotel. Prices are integer cents to avoid floating-point rounding.
export type Room = {
  id: string;
  hotelId: string; // references Hotel.id
  name: string;
  nightlyRateCents: number; // $248.00 → 24800
  maxGuests: number;
  available: boolean;
};

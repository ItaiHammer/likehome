// The POST /api/checkout body, built from the checkout form. No React or Next imports, so
// tests/checkout-request.test.mjs can check it against the route's own validators.

export type CheckoutForm = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  /** The party split, so the API can check the room's adult/child limits */
  adults: number;
  children: number;
  cardNumber: string;
  /** MM/YY, as typed */
  expiry: string;
  cvc: string;
  cardName: string;
  /** The guest's IANA time zone, e.g. "America/Los_Angeles": the API judges "today" in it (#79) */
  timeZone?: string;
};

export function checkoutRequest(form: CheckoutForm) {
  const [expMonth, expYear] = form.expiry.split("/").map(Number);
  return {
    room_id: form.roomId,
    check_in: form.checkIn,
    check_out: form.checkOut,
    // Capacity counts every guest; LiteAPI prices children apart from adults
    guests: form.adults + form.children,
    adults: form.adults,
    children: form.children,
    time_zone: form.timeZone,
    payment: {
      card_number: form.cardNumber.replace(/[\s-]/g, ""),
      exp_month: expMonth,
      exp_year: 2000 + expYear,
      cvc: form.cvc,
      name_on_card: form.cardName,
    },
  };
}

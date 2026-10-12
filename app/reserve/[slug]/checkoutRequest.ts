// The POST /api/checkout body, built from the checkout form. No React or Next imports, so
// tests/checkout-request.test.mjs can check it against the route's own validators.

export type CheckoutForm = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  cardNumber: string;
  /** MM/YY, as typed */
  expiry: string;
  cvc: string;
  cardName: string;
};

export function checkoutRequest(form: CheckoutForm) {
  const [expMonth, expYear] = form.expiry.split("/").map(Number);
  return {
    room_id: form.roomId,
    check_in: form.checkIn,
    check_out: form.checkOut,
    guests: form.guests,
    payment: {
      card_number: form.cardNumber.replace(/[\s-]/g, ""),
      exp_month: expMonth,
      exp_year: 2000 + expYear,
      cvc: form.cvc,
      name_on_card: form.cardName,
    },
  };
}

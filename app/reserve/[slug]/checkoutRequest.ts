type CheckoutStay = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  /** The party split, so the API can check the room's adult/child limits */
  adults: number;
  children: number;
  timeZone?: string;
  /** The chosen reward (lib/rewards STAY_DISCOUNTS id); /api/checkout prices its points from its own total */
  rewardId?: string;
  /** The stay total the guest saw, so /api/checkout can refuse a reward when its price differs */
  expectedTotal?: number;
};

export type CheckoutForm = CheckoutStay & (
  {
    cardNumber: string;
    expiry: string;
    cvc: string;
    cardName: string;
    savedPaymentMethodId?: never;
  } |
  {
    savedPaymentMethodId: string;
    cardNumber?: never;
    expiry?: never;
    cvc?: never;
    cardName?: never;
  }
);

export function checkoutRequest(form: CheckoutForm) {
  const base = {
    room_id: form.roomId,
    check_in: form.checkIn,
    check_out: form.checkOut,
    // Capacity counts every guest; LiteAPI prices children apart from adults
    guests: form.adults + form.children,
    adults: form.adults,
    children: form.children,
    time_zone: form.timeZone,
    ...(form.rewardId ? { reward_id: form.rewardId, expected_total: Math.round((form.expectedTotal ?? 0) * 100) / 100 } : {}),
  };

  if (form.savedPaymentMethodId) {
    return {
      ...base,
      payment: {
        saved_payment_method_id: form.savedPaymentMethodId,
      },
    };
  }

  const cardForm = form as CheckoutStay & {
    cardNumber: string;
    expiry: string;
    cvc: string;
    cardName: string;
  };

  const [expMonth, expYear] = cardForm.expiry.split("/").map(Number);


  return {
    ...base,
    payment: {
      card_number: cardForm.cardNumber.replace(/[\s-]/g, ""),
      exp_month: expMonth,
      exp_year: 2000 + expYear,
      cvc: form.cvc,
      name_on_card: form.cardName,
    },
  };
}
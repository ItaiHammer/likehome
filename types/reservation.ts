export interface CheckoutPayload {
  roomId: string;
  guestDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    specialRequests?: string;
  };
  paymentDetails: {
    cardType: string;
    cardNumber: string;
    expirationDate: string;
    cvv: string;
    zipCode: string;
  };
  useRewardPoints: boolean;
}

export interface CheckoutResponse {
  success: boolean;
  bookingId?: string;
  message?: string;
  errors?: Record<string, string>;
}
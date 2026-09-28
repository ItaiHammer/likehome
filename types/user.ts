// The signed-in user's account info, used to pre-fill checkout.
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null; // accounts may not have a phone on file
};

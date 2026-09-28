// A single hotel property. Room types and prices live on Room, since one hotel has many rooms.
export type Hotel = {
  id: string;
  name: string;
  address: string;
  imageUrl: string;
};

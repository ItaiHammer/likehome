export interface Room {
  id: string;
  name: string;
  property: string;
  address: string;
  dates: string;
  guests: string;
  checkIn: string;
  checkOut: string;
  amenities: string[];
  pricePerNight: number;
  nights: number;
  taxes: number;
  fee: number;
  image: string;
}

export const RoomsData: Record<string, Room> = {
  "ocean-studio": {
    id: "ocean-studio",
    name: "Ocean studio",
    property: "The Salt House",
    address: "123 Ocean Avenue, San Francisco, CA",
    dates: "Oct 12–16",
    guests: "2 guests",
    checkIn: "3:00 PM",
    checkOut: "11:00 AM",
    amenities: ["Ocean View", "Free High-Speed Wi-Fi", "King Bed", "Dedicated Workspace", "Espresso Machine"],
    pricePerNight: 248,
    nights: 4,
    taxes: 128,
    fee: 48,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
  },
  "penthouse-suite": {
    id: "penthouse-suite",
    name: "Penthouse Suite",
    property: "The Salt House",
    address: "123 Ocean Avenue, San Francisco, CA",
    dates: "Oct 12–16",
    guests: "4 guests",
    checkIn: "3:00 PM",
    checkOut: "11:00 AM",
    amenities: ["Private Balcony", "Soaking Tub", "Free High-Speed Wi-Fi", "Full Kitchen", "Valet Parking"],
    pricePerNight: 450,
    nights: 4,
    taxes: 210,
    fee: 75,
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
  },
};
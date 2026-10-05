import type { SceneVariant } from "../_components/WindowScene";

// Placeholder listings until the backend exists. The names borrow real hotel
// brands so the template reads like a real booking site; prices, ratings and
// rooms are made up, so swap in invented names before anything goes public.
export type Room = {
  id: string;
  name: string;
  description: string;
  sleeps: number;
  nightly: number;
  soldOut?: boolean;
};

export type Stay = {
  slug: string;
  name: string;
  location: string;
  /** Kind of place, shown on stay cards */
  type: string;
  /** A few standout amenities, shown as tags on stay cards */
  tags: string[];
  rating: number;
  reviews: number;
  variant: SceneVariant;
  cleaningFee: number;
  /** Nights already booked, as days from today. Placeholder until availability comes from the backend. */
  blockedNights: number[];
  rooms: Room[];
};

export const TAX_RATE = 0.12;

export const STAYS: Stay[] = [
  {
    slug: "four-seasons-positano",
    name: "Four Seasons Positano",
    location: "Positano, Italy",
    type: "Resort",
    tags: ["Sea view", "Pool", "Free breakfast"],
    rating: 4.96,
    reviews: 128,
    variant: "sea",
    cleaningFee: 45,
    blockedNights: [5, 6, 13],
    rooms: [
      { id: "garden", name: "Garden room", description: "Queen bed · Garden view", sleeps: 2, nightly: 214 },
      { id: "terrace", name: "Sea-view suite", description: "King bed · Private terrace", sleeps: 3, nightly: 289 },
      { id: "villa", name: "Private villa", description: "3 bedrooms · Full kitchen", sleeps: 6, nightly: 405, soldOut: true },
    ],
  },
  {
    slug: "fairmont-banff",
    name: "Fairmont Banff",
    location: "Banff, Canada",
    type: "Lodge",
    tags: ["Mountain view", "Spa", "Free parking"],
    rating: 4.92,
    reviews: 86,
    variant: "mountain",
    cleaningFee: 60,
    blockedNights: [3, 9, 10, 17],
    rooms: [
      { id: "loft", name: "Loft room", description: "Queen bed · Mountain view", sleeps: 2, nightly: 178 },
      { id: "chalet", name: "Mountain chalet", description: "2 bedrooms · Wood stove", sleeps: 5, nightly: 320 },
    ],
  },
  {
    slug: "hilton-joshua-tree",
    name: "Hilton Joshua Tree",
    location: "Joshua Tree, California",
    type: "Hotel",
    tags: ["Stargazing deck", "Hot tub", "Pet friendly"],
    rating: 4.89,
    reviews: 203,
    variant: "desert",
    cleaningFee: 50,
    blockedNights: [8, 15, 16],
    rooms: [
      { id: "king", name: "Desert king room", description: "King bed · Stargazing deck", sleeps: 2, nightly: 146 },
      { id: "casita", name: "Casita suite", description: "2 bedrooms · Hot tub", sleeps: 4, nightly: 265 },
    ],
  },
  {
    slug: "marriott-lisbon",
    name: "Marriott Lisbon",
    location: "Lisbon, Portugal",
    type: "Hotel",
    tags: ["River view", "City center", "Gym"],
    rating: 4.94,
    reviews: 157,
    variant: "city",
    cleaningFee: 35,
    blockedNights: [4, 11, 12, 20],
    rooms: [
      { id: "river", name: "River-view room", description: "Queen bed · River view", sleeps: 2, nightly: 132 },
      { id: "suite", name: "Two-bedroom suite", description: "2 bedrooms · Balcony", sleeps: 4, nightly: 219 },
    ],
  },
];

export const getStay = (slug: string) => STAYS.find((s) => s.slug === slug);

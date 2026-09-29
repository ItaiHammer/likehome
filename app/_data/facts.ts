import { TAX_RATE, type Stay } from "./stays";

export type FactId = "amenities" | "checkin" | "cancellation" | "fees" | "parking" | "pets" | "accessibility" | "location";

export type FactGroup = {
  id: FactId;
  /** Short label on the tag under the photos */
  tag: string;
  /** Heading in the expanded panel and the "All facts" dialog */
  title: string;
  items: { label: string; value: string }[];
};

// Placeholder facts until the backend provides them per stay. Fees and the
// cancellation window match what the reservation card charges.
export function getFacts(stay: Stay): FactGroup[] {
  return [
    {
      id: "amenities",
      tag: "Amenities",
      title: "Amenities",
      items: [
        { label: "Wi-Fi", value: "Free, in every room" },
        { label: "Heating and air conditioning", value: "In every room" },
        { label: "Kitchen", value: "Shared kitchen with the basics" },
        { label: "Washer", value: "On site, free to use" },
        { label: "Workspace", value: "Desk and chair in most rooms" },
        { label: "Linens and towels", value: "Provided" },
      ],
    },
    {
      id: "checkin",
      tag: "Check-in & out",
      title: "Check-in and check-out",
      items: [
        { label: "Check-in", value: "From 3:00 PM" },
        { label: "Check-out", value: "By 11:00 AM" },
        { label: "Self check-in", value: "Keypad code sent the day before" },
        { label: "Minimum age", value: "18 to book" },
        { label: "Quiet hours", value: "10:00 PM to 8:00 AM" },
        { label: "Bring", value: "Photo ID matching the booking name" },
      ],
    },
    {
      id: "cancellation",
      tag: "Cancellation",
      title: "Cancellation",
      items: [
        { label: "Free cancellation", value: "Up to 48 hours before check-in" },
        { label: "After that", value: "The first night is non-refundable" },
        { label: "No-show", value: "The full stay is charged" },
        { label: "Changing dates", value: "Free when the new dates are open" },
      ],
    },
    {
      id: "fees",
      tag: "Fees",
      title: "Fees and taxes",
      items: [
        { label: "Cleaning fee", value: `$${stay.cleaningFee} per stay` },
        { label: "Taxes", value: `${Math.round(TAX_RATE * 100)}% of the room and cleaning fee` },
        { label: "Service fee", value: "None" },
        { label: "Security deposit", value: "None" },
      ],
    },
    {
      id: "parking",
      tag: "Parking",
      title: "Parking and getting here",
      items: [
        { label: "Parking", value: "Free on site, one car" },
        { label: "EV charging", value: "Not available" },
        { label: "Directions", value: "Sent with your confirmation" },
      ],
    },
    {
      id: "pets",
      tag: "Pets",
      title: "Pets",
      items: [
        { label: "Pets", value: "Not allowed" },
        { label: "Service animals", value: "Always welcome" },
      ],
    },
    {
      id: "accessibility",
      tag: "Accessibility",
      title: "Accessibility",
      items: [
        { label: "Step-free entrance", value: "Yes" },
        { label: "Ground-floor room", value: "Ask when you book" },
        { label: "Wide doorways", value: "Main rooms only" },
      ],
    },
    {
      id: "location",
      tag: "Location",
      title: "Location",
      items: [
        { label: "Area", value: stay.location },
        { label: "Exact address", value: "Shared after booking" },
        { label: "Nearby", value: "Cafés and groceries within a short walk" },
      ],
    },
  ];
}

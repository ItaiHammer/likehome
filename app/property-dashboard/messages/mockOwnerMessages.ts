export interface Message {
    id: string;
    hotel_id: string;
    recipient_id: string;
    subject: string;
    body: string;
    read_at: string | null;
    created_at: string;
    hotels?: {
        name: string;
    };
}

export interface HotelRecipient {
    account_id: string;
    email: string;
    full_name: string;
    last_check_in: string | null;
    last_status: string | null;
}

// Preview-only records. These are never submitted to LikeHome's API or Supabase.
export const previewProperties = [
    {id: "mock-harbor-house", name: "Harbor House"},
    {id: "mock-pacific-terrace", name: "Pacific Terrace"},
];

export const previewRecipientsByHotel: Record<string, HotelRecipient[]> = {
    "mock-harbor-house": [
        {
            account_id: "mock-sarah",
            full_name: "Sarah Chen",
            email: "sarah@example.com",
            last_check_in: "2026-12-20",
            last_status: "confirmed"
        },
        {
            account_id: "mock-daniel",
            full_name: "Daniel Rivera",
            email: "daniel@example.com",
            last_check_in: "2026-08-14",
            last_status: "completed"
        },
    ],
    "mock-pacific-terrace": [
        {
            account_id: "mock-maya",
            full_name: "Maya Patel",
            email: "maya@example.com",
            last_check_in: "2026-12-05",
            last_status: "confirmed"
        },
    ],
};

export const previewSentMessages: Message[] = [
    {
        id: "mock-message-1",
        hotel_id: "mock-harbor-house",
        recipient_id: "mock-sarah",
        subject: "Your stay is coming up",
        body: "Hi Sarah,\n\nWe look forward to welcoming you to Harbor House in December! Check-in starts at 3 PM. We hope you have a wonderful stay.\n\nHarbor House Team",
        read_at: null,
        created_at: "2026-11-18T10:14:00Z",
        hotels: {name: "Harbor House"},
    },
    {
        id: "mock-message-2",
        hotel_id: "mock-harbor-house",
        recipient_id: "mock-daniel",
        subject: "Thank you for staying with us!",
        body: "Hi Daniel,\n\nThank you for visiting Harbor House! We hope you enjoyed your stay. We would love to welcome you back again soon.\n\nHarbor House Team",
        read_at: "2026-11-15T13:05:00Z",
        created_at: "2026-11-15T09:30:00Z",
        hotels: {name: "Harbor House"},
    },
    {
        id: "mock-message-3",
        hotel_id: "mock-pacific-terrace",
        recipient_id: "mock-maya",
        subject: "Preparing for your upcoming stay",
        body: "Hi Maya,\n\nYour reservation at Pacific Terrace is approaching. We'll send more details before arrival. We look forward to hosting you!\n\nPacific Terrace Team",
        read_at: "2026-11-17T08:00:00Z",
        created_at: "2026-11-16T14:00:00Z",
        hotels: {name: "Pacific Terrace"},
    },
    {
        id: "mock-message-4",
        hotel_id: "mock-pacific-terrace",
        recipient_id: "mock-maya",
        subject: "A winter getaway awaits",
        body: "Hi Maya,\n\nWinter is a lovely time to visit the coast. We'd be happy to welcome you again!\n\nPacific Terrace Team",
        read_at: null,
        created_at: "2026-11-13T09:00:00Z",
        hotels: {name: "Pacific Terrace"},
    },
];

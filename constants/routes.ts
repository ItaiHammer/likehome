export const ROUTE_PREFIXES = {
    PROTECTED: '/protected',
} as const;

export const API_ROUTES = {
    AUTH_CALLBACK: '/api/auth/callback',
}

export const PAGE_ROUTES = {
    LISTINGS: '/listings',
    LISTINGS_NEW: '/listings/new',
    SEARCH: '/search',
    AUTH_ERROR: '/auth/error',
    LOGIN: '/auth/login',
    MY_BOOKINGS: '/MyBookings',
    ACCOUNT_TYPE: '/account-type',
} as const;
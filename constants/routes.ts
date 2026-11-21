export const ROUTE_PREFIXES = {
    BUSINESS: ['/listings'],
    PERSONAL: ['/MyBookings'],
} as const;

export const API_ROUTES = {
    AUTH_CALLBACK: '/api/auth/callback',
    MESSAGES: '/api/messages',
    FAVORITES: '/api/favorites',
}

export const PAGE_ROUTES = {
    LISTINGS: '/listings',
    LISTINGS_NEW: '/listings/new',
    SEARCH: '/search',
    AUTH_ERROR: '/auth/error',
    AUTHORIZATION_ERROR: '/auth/z/error',
    LOGIN: '/auth/login',
    MY_BOOKINGS: '/MyBookings',
    MY_BOOKINGS_SAVED: '/MyBookings?tab=saved',
    MY_BOOKINGS_ACCOUNT: '/MyBookings?tab=account',
    REWARDS: '/MyBookings/rewards',
    REWARDS_HISTORY: '/MyBookings/rewards/history',
    ACCOUNT_TYPE: '/account-type',
    MESSAGES: '/messages',
    OWNER_MESSAGES: '/property-dashboard/messages',
    OWNER_CUSTOMERS: '/property-dashboard/customers',
} as const;

export const ROUTE_ACCESS = {
    INVALID_ACCOUNT_TYPE: 422,
    UNAUTHENTICATED: 401,
    UNAUTHORIZED: 403,
    PERMITTED: 200
} as const;

export type RouteAccess = typeof ROUTE_ACCESS[keyof typeof ROUTE_ACCESS];

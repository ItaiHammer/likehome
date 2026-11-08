export const ROUTE_PREFIXES = {
    BUSINESS: ['/listings'],
    PERSONAL: ['/MyBookings'],
} as const;

export const API_ROUTES = {
    AUTH_CALLBACK: '/api/auth/callback',
}

export const PAGE_ROUTES = {
    AUTH_ERROR: '/auth/error',
    AUTHORIZATION_ERROR: '/auth/z/error',
    LOGIN: '/auth/login',
    MY_BOOKINGS: '/MyBookings',
} as const;

export const ROUTE_ACCESS = {
    UNAUTHENTICATED: 'unauthenticated',
    UNAUTHORIZED: 'unauthorized',
    PERMITTED: 'permitted'
} as const;

export type RouteAccess = typeof ROUTE_ACCESS[keyof typeof ROUTE_ACCESS];
// The guests in one room, the way LiteAPI's rate requests take them (occupancies[]: adults, and children's ages).
// No server-only imports, so tests and pages can build a party without the rates module.

// LiteAPI prices each child by age. The site only asks how many children, so every child is quoted at this
// age until the guests field asks for ages.
export const DEFAULT_CHILD_AGE = 8
export const MAX_CHILD_AGE = 17

export type Party = { adults: number; children: number[] }

/** The party for `adults` and `children` guests, each child at DEFAULT_CHILD_AGE */
export const partyOf = (adults: number, children = 0): Party => ({
  adults,
  children: Array.from({ length: children }, () => DEFAULT_CHILD_AGE),
})

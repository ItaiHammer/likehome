export const LITEAPI_BASE = 'https://api.liteapi.travel/v3.0'

export interface LiteMoney { amount: number; currency: string }

export interface LiteHotelSummary {
  id: string
  name: string
  country: string
  city: string
  latitude: number
  longitude: number
  hotelDescription?: string
  address?: string
  main_photo?: string
  stars?: number
  deletedAt?: string | null
  // Not in the docs: on a deleted hotel, the hotel LiteAPI merged it into (null on live ones)
  primaryHotelId?: string | null
}

// GET /data/hotels?placeId=…: `country` is a 2-letter code here
export interface LiteHotelListing extends LiteHotelSummary {
  rating?: number
  reviewCount?: number
  facilityIds?: number[]
}

export interface LitePlace {
  placeId: string
  displayName: string
  formattedAddress?: string
  types?: string[]
}

export interface LiteRoom {
  id: number
  roomName: string
  maxAdults?: number
  maxChildren?: number
  maxOccupancy?: number
  // The docs call the bed type id "Id", but the API sends "id"
  bedTypes?: { id?: number; quantity: number; bedType: string; bedSize?: string }[]
  bedRelation?: 'NONE' | 'AND' | 'OR' | 'COMPLEX'
  roomAmenities?: { amenitiesId: number; name: string }[]
}

export interface LiteHotelDetail {
  id: string
  name: string
  city?: string
  /** 2-letter code */
  country?: string
  /** US hotels often start it with the state: "OR 97701" */
  zip?: string
  hotelDescription?: string
  address?: string
  hotelImages?: { url: string; urlHd?: string; order?: number; defaultImage?: boolean }[]
  main_photo?: string
  location?: { latitude: number; longitude: number }
  starRating?: number
  facilities?: { facilityId: number; name: string }[]
  hotelFacilities?: string[]
  // The docs say boolean, but the API sends "PAID", "FREE", "NOT_AVAILABLE" or ""
  parking?: boolean | string | null
  petsAllowed?: boolean | null
  policies?: { policy_type?: string; name?: string; description?: string }[]
  rooms?: LiteRoom[]
  deletedAt?: string | null
}

export interface LiteRatesRequest {
  hotelIds: string[]
  occupancies: { adults: number; children?: number[] }[]
  currency: string
  guestNationality: string
  checkin: string
  checkout: string
  timeout?: number
  maxRatesPerHotel?: number
  roomMapping?: boolean
  limit?: number
}

export interface LiteRate {
  rateId?: string
  name?: string
  boardType?: string
  mappedRoomId?: number | string
  // The party this rate was quoted for, repeated from the request. Not the room's limits.
  maxOccupancy?: number
  adultCount?: number
  childCount?: number
  childrenAges?: number[]
  retailRate?: {
    total?: LiteMoney[] | LiteMoney | null
    /** The lowest price the offer may be shown at publicly */
    suggestedSellingPrice?: LiteMoney[] | LiteMoney | null
    taxesAndFees?: { included: boolean; amount: number; currency: string; description?: string }[] | null
  }
  cancellationPolicies?: {
    refundableTag?: 'RFN' | 'NRFN'
    /** From cancelTime (GMT, "YYYY-MM-DD HH:mm:ss") on, cancelling costs `amount` */
    cancelPolicyInfos?: { cancelTime?: string; amount?: number; currency?: string; type?: string; timezone?: string }[] | null
  } | null
}

export interface LiteOffer {
  offerId?: string
  rates?: LiteRate[]
  offerRetailRate?: LiteMoney | LiteMoney[]
}

export interface LiteRatesResponse {
  data?: { hotelId: string; roomTypes?: LiteOffer[] }[]
  error?: { code: number; message: string }
}

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
  retailRate?: {
    total?: LiteMoney[] | LiteMoney | null
    taxesAndFees?: { included: boolean; amount: number; currency: string; description?: string }[] | null
  }
  cancellationPolicies?: { refundableTag?: 'RFN' | 'NRFN' } | null
}

export interface LiteOffer {
  offerId?: string
  rates?: LiteRate[]
  mappedRoomId?: number | string
  offerRetailRate?: LiteMoney | LiteMoney[]
}

export interface LiteRatesResponse {
  data?: { hotelId: string; roomTypes?: LiteOffer[] }[]
  error?: { code: number; message: string }
}

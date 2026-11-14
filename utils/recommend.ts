import { getUserId } from './user.ts'
import { type ComparisonHotelRow } from '../lib/comparison.ts'
import { getRecentlyViewedLocationAndPrice } from './recently-viewed.ts'

type ValidViewedRow = { viewed_at: string; hotels: ComparisonHotelRow }
type ViewedRow = ValidViewedRow & { hotels: ComparisonHotelRow | null }

export async function getRecentlyViewedSummary(): Promise<{ data: any, error: any }> {
    // 1. get recently viewed from database
    const { userId } = await getUserId()
    if (!userId) {
        return { data: null, error: 401 }
    }

    const { data, error } = await getRecentlyViewedLocationAndPrice(userId);

    // 2. Validate output
    if (error) {
        return { data: null, error }
    }

    const rows = (data ?? []) as unknown as ViewedRow[]
    const validRows = rows.filter(isValidRow)

    if (validRows.length === 0) {
        return { data: null, error: null }
    }

    // 3. Get most recently viewed location and timestamp (first row in DESC order)
    const latestHotel = validRows[0].hotels
    const city = latestHotel.city
    const region = latestHotel.region
    const country = latestHotel.country

    // 3. Min and max price across all rooms of all viewed hotels*
    const allPrices = validRows.flatMap((row) =>
        row.hotels?.rooms?.map((r: any) => Number(r.price_per_night)) ?? []
    )
    const validPrices = allPrices.filter(Number.isFinite)

    let minPrice: number | null = null
    let maxPrice: number | null = null

    // *enforce minimum spread
    if (validPrices.length > 0) {
        minPrice = Math.min(...validPrices)
        maxPrice = Math.max(...validPrices)

        const delta = maxPrice - minPrice
        const mid = (minPrice + maxPrice) / 2

        if (delta < 0.2 * mid) {
            const padding = Math.max(5, 0.1 * mid)
            minPrice = Math.round(Math.max(0, mid - padding) * 100) / 100;
            maxPrice = Math.round((minPrice + 2 * padding) * 100) / 100;
        }
    }

    return {
        data: {
            city,
            region,
            country,
            minPrice,
            maxPrice,
        },
        error,
    }
}

function isValidRow(row: ViewedRow): row is ValidViewedRow {
    const hotel = row.hotels
    const rooms = hotel?.rooms ?? []
    return Boolean(hotel && !hotel.liteapi_deleted_at && rooms.length > 0)
}
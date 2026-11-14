import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// Mock the extracted database helper function
mock.module('../utils/recently-viewed.ts', {
    namedExports: {
        getRecentlyViewedLocationAndPrice: mock.fn(),
    },
});

mock.module('../utils/user.ts', {
    namedExports: {
        getUserId: mock.fn(),
    },
});

const { getUserId } = await import('../utils/user.ts');
const { getRecentlyViewedLocationAndPrice } = await import('../utils/recently-viewed.ts');
const { getRecentlyViewedSummary } = await import('../utils/recommend.ts');

describe('getRecentlyViewedSummary Tests', () => {
    beforeEach(() => {
        getUserId.mock.resetCalls();
        getRecentlyViewedLocationAndPrice.mock.resetCalls();
    });

    test('returns 401 error when userId is missing', async () => {
        getUserId.mock.mockImplementationOnce(async () => ({ userId: null }));

        const result = await getRecentlyViewedSummary();
        assert.deepStrictEqual(result, { data: null, error: 401 });
    });

    test('returns database error directly if getRecentlyViewedLocationAndPrice query fails', async () => {
        getUserId.mock.mockImplementationOnce(async () => ({ userId: 'user-123' }));

        const dbError = { message: 'Database connection failed' };
        getRecentlyViewedLocationAndPrice.mock.mockImplementationOnce(async () => ({
            data: null,
            error: dbError,
        }));

        const result = await getRecentlyViewedSummary();
        assert.deepStrictEqual(result, { data: null, error: dbError });
    });

    test('returns data: null when no valid rows match criteria', async () => {
        getUserId.mock.mockImplementationOnce(async () => ({ userId: 'user-123' }));

        getRecentlyViewedLocationAndPrice.mock.mockImplementationOnce(async () => ({
            data: [
                { viewed_at: '2026-03-01', hotels: { liteapi_deleted_at: '2026-03-02', rooms: [{ price_per_night: 100 }] } },
                { viewed_at: '2026-03-01', hotels: { liteapi_deleted_at: null, rooms: [] } },
                { viewed_at: '2026-03-01', hotels: null },
            ],
            error: null,
        }));

        const result = await getRecentlyViewedSummary();
        assert.deepStrictEqual(result, { data: null, error: null });
    });

    test('calculates correct min/max prices and enforces minimum price spread padding', async () => {
        getUserId.mock.mockImplementationOnce(async () => ({ userId: 'user-123' }));

        getRecentlyViewedLocationAndPrice.mock.mockImplementationOnce(async () => ({
            data: [
                {
                    viewed_at: '2026-03-01',
                    hotels: {
                        city: 'Seattle',
                        region: 'Washington',
                        country: 'USA',
                        liteapi_deleted_at: null,
                        rooms: [{ price_per_night: '100' }, { price_per_night: '102' }],
                    },
                },
            ],
            error: null,
        }));

        const result = await getRecentlyViewedSummary();

        assert.strictEqual(result.error, null);
        assert.strictEqual(result.data.city, 'Seattle');
        assert.strictEqual(result.data.region, 'Washington');
        assert.strictEqual(result.data.country, 'USA');
        assert.strictEqual(typeof result.data.minPrice, 'number');
        assert.strictEqual(typeof result.data.maxPrice, 'number');
        assert.strictEqual(result.data.minPrice < result.data.maxPrice, true);
        assert.strictEqual(result.data.minPrice, 90.9);
        assert.strictEqual(result.data.maxPrice, 111.1);
    });

    test('calculates correct min/max prices and enforces minimum padding', async () => {
        getUserId.mock.mockImplementationOnce(async () => ({ userId: 'user-123' }));

        getRecentlyViewedLocationAndPrice.mock.mockImplementationOnce(async () => ({
            data: [
                {
                    viewed_at: '2026-03-01',
                    hotels: {
                        city: 'Chicago',
                        region: 'Illinois',
                        country: 'USA',
                        liteapi_deleted_at: null,
                        rooms: [{ price_per_night: '20' }, { price_per_night: '24' }],
                    },
                },
            ],
            error: null,
        }));

        const result = await getRecentlyViewedSummary();

        assert.strictEqual(result.error, null);
        assert.deepStrictEqual(result.data, {
            city: 'Chicago',
            region: 'Illinois',
            country: 'USA',
            minPrice: 17,
            maxPrice: 27,
        });
    });

    test('calculates standard min and max prices when spread is large enough', async () => {
        getUserId.mock.mockImplementationOnce(async () => ({ userId: 'user-123' }));

        getRecentlyViewedLocationAndPrice.mock.mockImplementationOnce(async () => ({
            data: [
                {
                    viewed_at: '2026-03-01',
                    hotels: {
                        city: 'Chicago',
                        region: 'Illinois',
                        country: 'USA',
                        liteapi_deleted_at: null,
                        rooms: [{ price_per_night: '80' }, { price_per_night: '250' }],
                    },
                },
            ],
            error: null,
        }));

        const result = await getRecentlyViewedSummary();

        assert.strictEqual(result.error, null);
        assert.deepStrictEqual(result.data, {
            city: 'Chicago',
            region: 'Illinois',
            country: 'USA',
            minPrice: 80,
            maxPrice: 250,
        });
    });
});
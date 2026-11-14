import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

// Mock only the database-dependent summary helper and low-level search DB client
mock.module('../utils/recommend.ts', {
    namedExports: {
        getRecentlyViewedSummary: mock.fn(),
    },
});

mock.module('../utils/search.ts', {
    namedExports: {
        searchAvailableHotels: mock.fn(),
    },
});

const { getRecentlyViewedSummary } = await import('../utils/recommend.ts');
const { searchAvailableHotels } = await import('../utils/search.ts');
const { GET } = await import('../app/api/recommend/route.ts');

describe('GET /api/recommend Route Tests', () => {
    beforeEach(() => {
        getRecentlyViewedSummary.mock.resetCalls();
        searchAvailableHotels.mock.resetCalls();
    });

    test('uses recently viewed summary data and passes correct filters to real search function', async () => {
        // Arrange
        getRecentlyViewedSummary.mock.mockImplementationOnce(async () => ({
            data: {
                city: 'San Francisco',
                region: 'California',
                country: 'USA',
                minPrice: 150,
                maxPrice: 300,
            },
            error: null,
        }));

        const mockDbResults = [{ id: 101, name: 'Bay Hotel' }];
        searchAvailableHotels.mock.mockImplementationOnce(async () => mockDbResults);

        const request = new Request('http://localhost:3000/api/recommend?time_zone=America/Los_Angeles');

        // Act
        const response = await GET(request);
        const json = await response.json();

        // Assert
        assert.strictEqual(getRecentlyViewedSummary.mock.callCount(), 1);
        
        // Verify real search() and DB call happened with correct mapped parameters
        assert.strictEqual(searchAvailableHotels.mock.callCount(), 1);
        assert.deepStrictEqual(searchAvailableHotels.mock.calls[0].arguments[0], {
            city: 'San Francisco',
            region: 'California',
            country: 'USA',
            check_in: undefined,
            check_out: undefined,
            guests: undefined,
            adults: undefined,
            children: undefined,
            min_price: 150,
            max_price: 300,
            min_rating: undefined,
            num_beds: undefined,
            bed_size: undefined,
            tags: undefined,
            sort: undefined,
        });

        assert.deepStrictEqual(json, { 
            data: { 
                params: { 
                    location: { city: 'San Francisco', region: 'California', country: 'USA' }, 
                    price: { min: 150, max: 300 } 
                }, 
                results: mockDbResults 
            } 
        });
    });

    test('falls back to Los Angeles time zone when recently viewed data is empty and Los Angeles time zone provided', async () => {
        // Arrange
        getRecentlyViewedSummary.mock.mockImplementationOnce(async () => ({
            data: null,
            error: null,
        }));

        searchAvailableHotels.mock.mockImplementationOnce(async () => []);

        const request = new Request('http://localhost:3000/api/recommend?time_zone=America/Los_Angeles');

        // Act
        const response = await GET(request);

        // Assert
        const dbCallArgs = searchAvailableHotels.mock.calls[0].arguments[0];
        // America/Los_Angeles triggers the real mapTimeZoneToLocation demo branch ('Los Angeles, California, USA')
        assert.strictEqual(dbCallArgs.city, 'Los Angeles');
        assert.strictEqual(dbCallArgs.region, 'California');
        assert.strictEqual(dbCallArgs.country, 'USA');

    });

    test('falls back to default location when timezone is unknown', async () => {
        // Arrange
        getRecentlyViewedSummary.mock.mockImplementationOnce(async () => ({
            data: { city: '', region: '', country: '', minPrice: 100, maxPrice: 300 },
            error: null,
        }));

        searchAvailableHotels.mock.mockImplementationOnce(async () => []);

        const request = new Request('http://localhost:3000/api/recommend?time_zone=Europe/London');

        // Act
        await GET(request);

        // Assert
        const dbCallArgs = searchAvailableHotels.mock.calls[0].arguments[0];
        // Non-demo timezone triggers the real default branch ('New York, New York, USA')
        assert.strictEqual(dbCallArgs.city, 'New York');
        assert.strictEqual(dbCallArgs.region, 'New York');
        assert.strictEqual(dbCallArgs.country, 'USA');
        // Price included
        assert.strictEqual(dbCallArgs.min_price, 100);
        assert.strictEqual(dbCallArgs.max_price, 300);
    });

    test('falls back to default location when timezone is missing', async () => {
        // Arrange
        getRecentlyViewedSummary.mock.mockImplementationOnce(async () => ({
            data: { city: '', region: '', country: '', minPrice: 100, maxPrice: 300 },
            error: null,
        }));

        searchAvailableHotels.mock.mockImplementationOnce(async () => []);

        const request = new Request('http://localhost:3000/api/recommend');

        // Act
        await GET(request);

        // Assert
        const dbCallArgs = searchAvailableHotels.mock.calls[0].arguments[0];
        // Non-demo timezone triggers the real default branch ('New York, New York, USA')
        assert.strictEqual(dbCallArgs.city, 'New York');
        assert.strictEqual(dbCallArgs.region, 'New York');
        assert.strictEqual(dbCallArgs.country, 'USA');
        // Price included
        assert.strictEqual(dbCallArgs.min_price, 100);
        assert.strictEqual(dbCallArgs.max_price, 300);
    });

    test('filters out blank location segments correctly before search', async () => {
        // Arrange
        getRecentlyViewedSummary.mock.mockImplementationOnce(async () => ({
            data: {
                city: 'Paris',
                region: '   ', // blank region should be filtered out by .filter()
                country: 'France',
                minPrice: 100,
                maxPrice: 200,
            },
            error: null,
        }));

        searchAvailableHotels.mock.mockImplementationOnce(async () => []);

        const request = new Request('http://localhost:3000/api/recommend');

        // Act
        await GET(request);

        // Assert
        const dbCallArgs = searchAvailableHotels.mock.calls[0].arguments[0];
        assert.strictEqual(dbCallArgs.city, 'Paris');
        assert.strictEqual(dbCallArgs.region, undefined);
        assert.strictEqual(dbCallArgs.country, 'France');
    });
});
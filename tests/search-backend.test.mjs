import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

mock.module('../utils/search.ts', {
    namedExports: {
        searchAvailableHotels: mock.fn(),
    },
});

const { searchAvailableHotels } = await import('../utils/search.ts');
const {
    search
} = await import('../app/search/search.ts');


describe('Search Module Integration', () => {
    beforeEach(() => {
        searchAvailableHotels.mock.resetCalls();
    });

    describe('search -> getSearchParams', () => {

        const searchRequestTestCases = [
            {
                name: 'returns empty filter object when searchParams is null or undefined',
                input: undefined,
                expectedParams: {},
            },
            {
                name: 'correctly aggregates all valid parameter types into PropertyFilter structure',
                input: {
                    where: 'Paris, France',
                    checkIn: '2026-06-15',
                    checkOut: '2026-06-20',
                    numBeds: '2',
                    bedSize: 'Queen',
                    adults: '2',
                    children: '1',
                    minPrice: '100',
                    maxPrice: '500',
                    minRating: '4',
                    sort: 'price-high',
                    tags: ['Free Wi-Fi', 'Pool'],
                },
                expectedParams: {
                    location: { city: 'Paris', country: 'France' },
                    dates: { checkIn: '2026-06-15', checkOut: '2026-06-20' },
                    beds: { num: 2, size: 'Queen' },
                    guests: { adults: 2, children: 1, total: 3 },
                    price: { min: 100, max: 500 },
                    rating: { minStars: 4 },
                    sort: 'price-high',
                    tags: ['Free Wi-Fi', 'Pool'],
                },
            },
            {
                name: 'filters out invalid parameters and omits corresponding fields',
                input: {
                    where: 'Paris', // 1 segment -> city only
                    checkIn: 'invalid-date',
                    numBeds: 'abc',
                    adults: '2',
                },
                expectedParams: {
                    location: { city: 'Paris' },
                    guests: { adults: 2, total: 2 },
                },
            },
        ];

        for (const { name, input, expectedParams } of searchRequestTestCases) {
            test(name, async () => {
                // Act
                const response = await search(input);

                // Assert
                assert.deepStrictEqual(response.params, expectedParams);
            });
        }
    });

    describe('search function database mapping', () => {

        test('maps standardized parameters correctly to searchAvailableHotels call', async () => {
            // Arrange
            const mockSearchRequest = {
                where: 'Osaka, Osaka Prefecture, Japan',
                checkIn: '2026-07-01',
                checkOut: '2026-07-05',
                adults: '2',
                children: '2',
                minPrice: '150',
                maxPrice: '400',
                minRating: '4',
                numBeds: '2',
                bedSize: 'Queen',
                tags: ['Free Wi-Fi', 'Pool'],
                sort: 'recommended',
            };

            const mockDbResults = [{ id: 42, name: 'Grand Tokyo Hotel' }];
            searchAvailableHotels.mock.mockImplementationOnce(async () => mockDbResults);

            // Act
            const result = await search(mockSearchRequest);

            // Assert
            // 1. Verify searchAvailableHotels received mapped DB fields including the new properties
            assert.strictEqual(searchAvailableHotels.mock.callCount(), 1);
            assert.deepStrictEqual(searchAvailableHotels.mock.calls[0].arguments[0], {
                city: 'Osaka',
                region: 'Osaka Prefecture',
                country: 'Japan',
                check_in: '2026-07-01',
                check_out: '2026-07-05',
                guests: 4, // 2 adults + 2 children total
                min_price: 150,
                max_price: 400,
                min_rating: 4,
                num_beds: 2,
                bed_size: 'Queen',
                tags: ['Free Wi-Fi', 'Pool'],
                sort: 'recommended',
            });

            // 2. Verify wrapper returns expected composite response shape
            assert.deepStrictEqual(result, {
                params: {
                    location: { city: 'Osaka', region: 'Osaka Prefecture', country: 'Japan' },
                    dates: { checkIn: '2026-07-01', checkOut: '2026-07-05' },
                    guests: { adults: 2, children: 2, total: 4 },
                    price: { min: 150, max: 400 },
                    rating: { minStars: 4 },
                    beds: { num: 2, size: 'Queen' },
                    tags: ['Free Wi-Fi', 'Pool'],
                    sort: 'recommended',
                },
                results: mockDbResults,
            });
        });

        test('handles null/empty search request gracefully when querying database', async () => {
            // Arrange
            searchAvailableHotels.mock.mockImplementationOnce(async () => ({}));

            // Act
            const result = await search(undefined);

            // Assert
            assert.deepStrictEqual(searchAvailableHotels.mock.calls[0].arguments[0], {
                city: undefined,
                region: undefined,
                country: undefined,
                check_in: undefined,
                check_out: undefined,
                guests: undefined,
                min_price: undefined,
                max_price: undefined,
                min_rating: undefined,
                num_beds: undefined,
                bed_size: undefined,
                tags: undefined,
                sort: undefined,
            });
            assert.deepStrictEqual(result, {
                params: {},
                results: {},
            });
        });

        test('passes page options through to the database call without adding them to params', async () => {
            // Arrange
            searchAvailableHotels.mock.mockImplementationOnce(async () => ({}));

            // Act
            const result = await search({ where: 'Paris, France' }, { page: 3, pageSize: 21 });

            // Assert
            const dbCall = searchAvailableHotels.mock.calls[0].arguments[0];
            assert.strictEqual(dbCall.page, 3);
            assert.strictEqual(dbCall.page_size, 21);
            assert.strictEqual(dbCall.city, 'Paris');
            assert.deepStrictEqual(result.params, { location: { city: 'Paris', country: 'France' } });
        });
    });
});

describe('search location parameter', () => {
    const testCases = [
        {
            name: 'returns undefined when location is undefined',
            input: undefined,
            expected: undefined,
        },
        {
            name: 'returns undefined when location is whitespace',
            input: ' ',
            expected: undefined,
        },
        {
            name: 'returns city only when 1 segment is provided',
            input: 'Paris',
            expected: { city: 'Paris' },
        },
        {
            name: 'returns city and country when 2 segments are provided',
            input: 'Paris, France',
            expected: { city: 'Paris', country: 'France' },
        },
        {
            name: 'handles extra spaces around commas correctly for 2 segments',
            input: '   Paris   ,   France  ',
            expected: { city: 'Paris', country: 'France' },
        },
        {
            name: 'returns city, region, and country when 3 segments are provided',
            input: 'San Francisco, California, United States of America',
            expected: { city: 'San Francisco', region: 'California', country: 'United States of America' },
        },
        {
            name: 'returns city and country, skipping middle segments, when more than 3 segments are provided',
            input: 'Springfield, CountyA, StateB, CountryX',
            expected: { city: 'Springfield', country: 'CountryX' },
        },
    ];

    for (const { name, input, expected } of testCases) {
        test(name, async () => {
            // Act
            const response = await search({ where: input });

            // Assert
            assert.deepStrictEqual(response.params.location, expected);
        });
    }
});

describe('search dates parameter', () => {
    const testCases = [
        {
            name: 'returns undefined when both checkIn and checkOut are undefined',
            checkIn: undefined,
            checkOut: undefined,
            expected: undefined,
        },
        {
            name: 'returns undefined when both checkIn and checkOut are invalid dates',
            checkIn: 'invalid-checkin',
            checkOut: 'invalid-checkout',
            expected: undefined,
        },
        {
            name: 'returns formatted checkIn when only checkIn is valid',
            checkIn: '2026-06-15',
            checkOut: undefined,
            expected: { checkIn: '2026-06-15' },
        },
        {
            name: 'returns formatted checkOut when only checkOut is valid',
            checkIn: undefined,
            checkOut: '2026-06-20',
            expected: { checkOut: '2026-06-20' },
        },
        {
            name: 'returns valid checkOut when checkIn is invalid',
            checkIn: 'invalid-checkin',
            checkOut: '2026-06-20',
            expected: { checkOut: '2026-06-20' },
        },
        {
            name: 'returns valid checkIn when checkOut is invalid',
            checkIn: '2026-06-15',
            checkOut: 'invalid-checkout',
            expected: { checkIn: '2026-06-15' },
        },
        {
            name: 'returns both dates formatted when checkIn is strictly before checkOut',
            checkIn: '2026-06-15T00:00:00.000Z',
            checkOut: '2026-06-20T00:00:00.000Z',
            expected: { checkIn: '2026-06-15', checkOut: '2026-06-20' },
        },
        {
            name: 'returns undefined when checkIn and checkOut are on the same day (equal times)',
            checkIn: '2026-06-15',
            checkOut: '2026-06-15',
            expected: undefined,
        },
        {
            name: 'returns undefined when checkIn is after checkOut (greater time)',
            checkIn: '2026-06-25',
            checkOut: '2026-06-20',
            expected: undefined,
        },
    ];

    for (const { name, checkIn, checkOut, expected } of testCases) {
        test(name, async () => {
            // Act
            const response = await search({ checkIn, checkOut });

            // Assert
            assert.deepStrictEqual(response.params.dates, expected);
        });
    }
});

describe('search beds parameter', () => {
    const testCases = [
        {
            name: 'returns undefined when both num and size are undefined',
            num: undefined,
            size: undefined,
            expected: undefined,
        },
        {
            name: 'returns undefined when both inputs are invalid (non-numeric string and invalid bed size)',
            num: 'abc',
            size: 'extra-large',
            expected: undefined,
        },
        {
            name: 'returns undefined when both inputs are empty or whitespace strings',
            num: '   ',
            size: '',
            expected: undefined,
        },
        {
            name: 'returns valid number when size is undefined',
            num: '2',
            size: undefined,
            expected: { num: 2 },
        },
        {
            name: 'returns valid number (float/string number) when size is invalid',
            num: '1',
            size: 'invalid-size',
            expected: { num: 1 },
        },
        {
            name: 'returns undefined for num when num is an invalid string, with undefined size',
            num: 'not-a-number',
            size: undefined,
            expected: undefined,
        },
        {
            name: 'returns valid size when num is undefined',
            num: undefined,
            size: 'Queen',
            expected: { size: 'Queen' },
        },
        {
            name: 'returns valid size when num is invalid',
            num: 'abc',
            size: 'King',
            expected: { size: 'King' },
        },
        {
            name: 'returns undefined for both when num is undefined and size is not in validValues',
            num: undefined,
            size: 'unknown-size',
            expected: undefined,
        },
        {
            name: 'returns both valid parsed number and valid bed size when both inputs are correct',
            num: '3',
            size: 'Double',
            expected: { num: 3, size: 'Double' },
        },
    ];

    for (const { name, num, size, expected } of testCases) {
        test(name, async () => {
            // Act
            const response = await search({ numBeds: num, bedSize: size });

            // Assert
            assert.deepStrictEqual(response.params.beds, expected);
        });
    }
});

describe('search guests parameter', () => {
    const testCases = [
        {
            name: 'returns undefined when both adults and children are undefined',
            adults: undefined,
            children: undefined,
            expected: undefined,
        },
        {
            name: 'returns undefined when both adults and children are invalid strings',
            adults: 'abc',
            children: 'xyz',
            expected: undefined,
        },
        {
            name: 'returns undefined when both inputs are whitespace strings',
            adults: '   ',
            children: '',
            expected: undefined,
        },
        {
            name: 'returns valid children, with total matching children when adults is undefined',
            adults: undefined,
            children: '2',
            expected: { children: 2, total: 2 },
        },
        {
            name: 'returns valid children when adults is an invalid string',
            adults: 'not-a-number',
            children: '3',
            expected: { children: 3, total: 3 },
        },
        {
            name: 'returns valid adults, and matching total when only adults is valid',
            adults: '2',
            children: undefined,
            expected: { adults: 2, total: 2 },
        },
        {
            name: 'returns valid adults when children is an invalid string',
            adults: '3',
            children: 'invalid-child',
            expected: { adults: 3, total: 3 },
        },
        {
            name: 'returns correct adults, children, and summed total when both inputs are valid',
            adults: '2',
            children: '2',
            expected: { adults: 2, children: 2, total: 4 },
        },
    ];

    for (const { name, adults, children, expected } of testCases) {
        test(name, async () => {
            // Act
            const response = await search({ adults, children });

            // Assert
            assert.deepStrictEqual(response.params.guests, expected);
        });
    }
});

describe('search price parameter', () => {
    const priceTestCases = [
        {
            name: 'returns undefined when both min and max are undefined',
            min: undefined,
            max: undefined,
            expected: undefined,
        },
        {
            name: 'returns undefined when both min and max are invalid numeric strings',
            min: 'abc',
            max: 'xyz',
            expected: undefined,
        },
        {
            name: 'returns min price when only min is valid',
            min: '50',
            max: undefined,
            expected: { min: 50 },
        },
        {
            name: 'returns max price when only max is valid',
            min: undefined,
            max: '200',
            expected: { max: 200 },
        },
        {
            name: 'returns max price when min is invalid',
            min: 'invalid',
            max: '150',
            expected: { max: 150 },
        },
        {
            name: 'handles valid min and invalid max string by returning only valid min',
            min: '50',
            max: 'invalid',
            expected: { min: 50 },
        },
        {
            name: 'returns both min and max prices when min is strictly less than max',
            min: '50',
            max: '200',
            expected: { min: 50, max: 200 },
        },
        {
            name: 'returns both min and max prices when min is equal to max',
            min: '100',
            max: '100',
            expected: { min: 100, max: 100 },
        },
        {
            name: 'returns undefined when min price is greater than max price',
            min: '250',
            max: '100',
            expected: undefined,
        },
    ];

    for (const { name, min, max, expected } of priceTestCases) {
        test(name, async () => {
            // Act
            const response = await search({ minPrice: min, maxPrice: max });

            // Assert
            assert.deepStrictEqual(response.params.price, expected);
        });
    }
});

describe('search rating parameter', () => {
    const ratingTestCases = [
        {
            name: 'returns undefined when rating is undefined',
            min: undefined,
            expected: undefined,
        },
        {
            name: 'returns undefined when rating string is invalid',
            min: 'five-stars',
            expected: undefined,
        },
        {
            name: 'returns minStars object when rating string is a valid number',
            min: '4',
            expected: { minStars: 4 },
        },
        {
            name: 'correctly handles floating point/decimal rating strings',
            min: '4.5',
            expected: { minStars: 4.5 },
        },
    ];

    for (const { name, min, expected } of ratingTestCases) {
        test(name, async () => {
            // Act
            const response = await search({ minRating: min });
            // Assert
            assert.deepStrictEqual(response.params.rating, expected);
        });
    }
});

describe('search sort parameter', () => {
    const sortTestCases = [
        {
            name: 'returns undefined when sort is undefined',
            sort: undefined,
            expected: undefined,
        },
        {
            name: 'returns undefined when sort value is not in valid sorts list',
            sort: 'invalid-sort',
            expected: undefined,
        },
        {
            name: 'returns sort value when it is included in valid sorts',
            sort: 'price-high',
            expected: 'price-high',
        },
    ];

    for (const { name, sort, expected } of sortTestCases) {
        test(name, async () => {
            // Act
            const response = await search({ sort });
            // Assert
            assert.deepStrictEqual(response.params.sort, expected);
        });
    }
});

describe('search tag parameter', () => {
    const tagTestCases = [
        {
            name: 'returns undefined when tagInput is undefined',
            tagInput: undefined,
            expected: undefined,
        },
        {
            name: 'returns undefined when none of the provided tags are valid',
            tagInput: ['invalid-tag-1', 'invalid-tag-2'],
            expected: undefined,
        },
        {
            name: 'returns filtered array of valid tags when some tags are valid',
            tagInput: ['Free Wi-Fi', 'invalid-tag', 'Pool'],
            expected: ['Free Wi-Fi', 'Pool'],
        },
        {
            name: 'returns array of tags when all provided tags are valid',
            tagInput: ['Free Wi-Fi', 'Parking'],
            expected: ['Free Wi-Fi', 'Parking'],
        },
        {
            name: 'returns array of tags when one invalid tag provided (string)',
            tagInput: 'invalid-tag',
            expected: undefined
        },
        {
            name: 'returns array of tags when one valid tag provided (string)',
            tagInput: 'Pool',
            expected: ['Pool']
        },
    ];

    for (const { name, tagInput, expected } of tagTestCases) {
        test(name, async () => {
            // Act
            const response = await search({ tags: tagInput });
            // Assert
            assert.deepStrictEqual(response.params.tags, expected);
        });
    }
});
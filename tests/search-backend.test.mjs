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

function getDateFromToday(daysFromToday) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return d.toISOString().split('T')[0]
}

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
                    checkIn: getDateFromToday(0),
                    checkOut: getDateFromToday(1),
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
                    dates: { checkIn: getDateFromToday(0), checkOut: getDateFromToday(1) },
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
                checkIn: getDateFromToday(0),
                checkOut: getDateFromToday(1),
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
                region: undefined, // only US hotels are stored with a region
                country: 'Japan',
                check_in: getDateFromToday(0),
                check_out: getDateFromToday(1),
                guests: 4, // 2 adults + 2 children total
                adults: 2,
                children: 2,
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
                    dates: { checkIn: getDateFromToday(0), checkOut: getDateFromToday(1) },
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
                adults: undefined,
                children: undefined,
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

        test('sends US spellings to the database as "USA", the way hotels store it', async () => {
            for (const where of [
                'San Diego, California, United States of America',
                'San Diego, California, United States',
                'San Diego, California, usa',
            ]) {
                // Arrange
                searchAvailableHotels.mock.resetCalls();
                searchAvailableHotels.mock.mockImplementationOnce(async () => ({}));

                // Act
                const result = await search({ where });

                // Assert
                const dbCall = searchAvailableHotels.mock.calls[0].arguments[0];
                assert.strictEqual(dbCall.country, 'USA', where);
                assert.strictEqual(dbCall.city, 'San Diego');
                assert.strictEqual(result.params.location.country, where.split(', ')[2]); // params keep the request's wording
            }
        });

        test('leaves other countries as written', async () => {
            // Arrange
            searchAvailableHotels.mock.mockImplementationOnce(async () => ({}));

            // Act
            await search({ where: 'Vancouver, British Columbia, Canada' });

            // Assert
            assert.strictEqual(searchAvailableHotels.mock.calls[0].arguments[0].country, 'Canada');
        });

        test('sends a region only for the US, as the full state name hotels store', async () => {
            for (const [where, region, country] of [
                ['Miami, FL, USA', 'Florida', 'USA'],
                ['Miami, Florida, United States', 'Florida', 'USA'],
                ['Washington, D.C., United States', 'District of Columbia', 'USA'],
                ['Rome, Metropolitan City of Rome Capital, Italy', undefined, 'Italy'],
                ['Banff, Alberta, Canada', undefined, 'Canada'],
            ]) {
                // Arrange
                searchAvailableHotels.mock.resetCalls();
                searchAvailableHotels.mock.mockImplementationOnce(async () => ({}));

                // Act
                const result = await search({ where });

                // Assert
                const dbCall = searchAvailableHotels.mock.calls[0].arguments[0];
                assert.strictEqual(dbCall.region, region, where);
                assert.strictEqual(dbCall.country, country, where);
                assert.strictEqual(result.params.location.region, where.split(', ')[1]); // params keep the request's wording
            }
        });

        test('sends other spellings of a country the way hotels store it', async () => {
            for (const [where, country] of [
                ['London, UK', 'United Kingdom'],
                ['Edinburgh, Scotland', 'United Kingdom'],
                ['Istanbul, Turkey', 'Türkiye'],
                ['Dubai, UAE', 'United Arab Emirates'],
                ['Amsterdam, The Netherlands', 'Netherlands'],
            ]) {
                // Arrange
                searchAvailableHotels.mock.resetCalls();
                searchAvailableHotels.mock.mockImplementationOnce(async () => ({}));

                // Act
                await search({ where });

                // Assert
                assert.strictEqual(searchAvailableHotels.mock.calls[0].arguments[0].country, country, where);
            }
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
            name: 'clamps past checkIn dates to today in UTC and adjusts checkOut accordingly',
            checkIn: '2020-01-01',
            checkOut: '2020-01-05',
            // Past dates get clamped to today's UTC date, and checkOut is adjusted relative to today
            expected: { checkIn: new Date().toISOString().split('T')[0], checkOut: getDateFromToday(1) },
        },
        {
            name: 'auto-calculates checkOut as checkIn + 1 day when only checkIn is provided in the future',
            checkIn: getDateFromToday(10),
            checkOut: undefined,
            expected: { checkIn: getDateFromToday(10), checkOut: getDateFromToday(11) }, 
        },
        {
            name: 'auto-calculates checkIn as checkOut - 1 day when only checkOut is provided in the future',
            checkIn: undefined,
            checkOut: getDateFromToday(15),
            expected: { checkIn: getDateFromToday(14), checkOut: getDateFromToday(15) },
        },
        {
            name: 'auto-corrects inverted range where checkOut <= checkIn by bumping checkOut',
            checkIn: getDateFromToday(5),
            checkOut: getDateFromToday(3),
            expected: { checkIn: getDateFromToday(5), checkOut: getDateFromToday(6) },
        },
        {
            name: 'auto-corrects inverted range where checkOut == checkIn by bumping checkOut',
            checkIn: getDateFromToday(5),
            checkOut: getDateFromToday(5),
            expected: { checkIn: getDateFromToday(5), checkOut: getDateFromToday(6) },
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
        {
            name: 'returns rounded bed count',
            num: '3.7',
            size: undefined,
            expected: { num: 4 },
        },
        {
            name: 'returns 0 bed count when negative',
            num: '-3.7',
            size: undefined,
            expected: { num: 0 },
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
        {
            name: 'returns rounded children count',
            adults: '2',
            children: '2.3',
            expected: { adults: 2, children: 2, total: 4 },
        },
        {
            name: 'returns 0 children when negative',
            adults: '2',
            children: '-2',
            expected: { adults: 2, children: 0, total: 2 },
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
            name: 'returns swapped when min price is greater than max price',
            min: '250',
            max: '100',
            expected: { min: 100, max: 250 },
        },
        {
            name: 'returns to 2 decimal places ',
            min: '111.123',
            max: '222.456',
            expected: { min: 111.12, max: 222.46 },
        },
        {
            name: 'bounds to 0 when negative',
            min: '-250',
            max: '100',
            expected: { min: 0, max: 100 },
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
            min: '4.556',
            expected: { minStars: 4.6 },
        },
        {
            name: 'bounds to 0 when negative',
            min: '-4.556',
            expected: { minStars: 0 },
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
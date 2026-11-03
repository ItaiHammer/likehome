// Live LiteAPI prices on search results: app/search/livePrices.ts with getFromPrices mocked.
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let quotes = {};
const getFromPrices = mock.fn(async (ids) => new Map(ids.filter((id) => id in quotes).map((id) => [id, quotes[id]])));
mock.module('../lib/liteapi/rates.ts', { namedExports: { getFromPrices } });
const consoleWarn = mock.method(console, 'warn', () => {});

const { priceSearchResults } = await import('../app/search/livePrices.ts');

const DATES = { checkIn: '2099-06-10', checkOut: '2099-06-13' };
const owner = (id, price) => ({ id, name: id, min_price: price, liteapi_id: null });
const lite = (id, liteapiId, price) => ({ id, name: id, min_price: price, liteapi_id: liteapiId });
const live = (perNight) => ({
    status: 'live',
    value: { total: perNight * 3, perNight, offerId: 'offer', rateName: 'Room only', boardType: 'RO', refundable: true, dueAtProperty: 0 },
});
const SOLD_OUT = { status: 'sold_out' };
const UNAVAILABLE = { status: 'unavailable' };
const ids = (rows) => rows.map((row) => row.id);

beforeEach(() => {
    quotes = {};
    getFromPrices.mock.resetCalls();
    consoleWarn.mock.resetCalls();
});

test('without dates, rows come back untouched and LiteAPI is never called', async () => {
    const rows = [owner('o1', 300), lite('h1', 'lp1', 50)];
    const result = await priceSearchResults(rows, { price: { min: 100 }, sort: 'price-low' });
    assert.equal(result, rows);
    assert.deepEqual(result, [owner('o1', 300), lite('h1', 'lp1', 50)]);
    assert.equal(getFromPrices.mock.callCount(), 0);
});

test('with dates but no LiteAPI hotels, rows come back untouched and LiteAPI is never called', async () => {
    const rows = [owner('o1', 300), owner('o2', 50)];
    const result = await priceSearchResults(rows, { dates: DATES, price: { min: 100 }, sort: 'price-low' });
    assert.equal(result, rows);
    assert.equal(getFromPrices.mock.callCount(), 0);
});

test('LiteAPI rows get the live per-night price; owner rows keep theirs', async () => {
    quotes = { lp1: live(163.66 / 3), lp2: live(80) };
    const result = await priceSearchResults(
        [lite('h1', 'lp1', 200), owner('o1', 129.99), lite('h2', 'lp2', 95)],
        { dates: DATES, guests: { adults: 2, children: 1, total: 3 } },
    );
    assert.deepEqual(result, [lite('h1', 'lp1', 163.66 / 3), owner('o1', 129.99), lite('h2', 'lp2', 80)]);
    assert.equal(getFromPrices.mock.callCount(), 1);
    // Children are priced as children (at the default age), not as more adults
    assert.deepEqual(getFromPrices.mock.calls[0].arguments, [['lp1', 'lp2'], { ...DATES, adults: 2, children: [8] }]);
});

test('adults default to 2, like the stay page, and children to none', async () => {
    quotes = { lp1: live(100) };
    await priceSearchResults([lite('h1', 'lp1', 120)], { dates: DATES });
    // adults=0 in the link parses to 0 adults
    await priceSearchResults([lite('h1', 'lp1', 120)], { dates: DATES, guests: { adults: 0, total: 0 } });
    // children only: the stay page adds its 2 adults, so the search prices the same party
    await priceSearchResults([lite('h1', 'lp1', 120)], { dates: DATES, guests: { children: 2, total: 2 } });
    assert.deepEqual(
        getFromPrices.mock.calls.map((call) => call.arguments[1]),
        [{ ...DATES, adults: 2, children: [] }, { ...DATES, adults: 2, children: [] }, { ...DATES, adults: 2, children: [8, 8] }],
    );
});

test('sold-out LiteAPI rows are dropped', async () => {
    quotes = { lp1: SOLD_OUT, lp2: live(90) };
    const result = await priceSearchResults([lite('h1', 'lp1', 100), owner('o1', 120), lite('h2', 'lp2', 110)], { dates: DATES });
    assert.deepEqual(ids(result), ['o1', 'h2']);
});

test('owner rows are never filtered again, even outside the price range', async () => {
    quotes = { lp1: live(150) };
    const result = await priceSearchResults(
        [owner('o1', 20), lite('h1', 'lp1', 150), owner('o2', '999.00')],
        { dates: DATES, price: { min: 100, max: 200 } },
    );
    assert.deepEqual(ids(result), ['o1', 'h1', 'o2']);
});

test('the min/max range applies to LiteAPI rows on their live price', async () => {
    quotes = { lp1: live(150), lp2: live(50), lp3: live(250), lp4: live(100), lp5: live(200) };
    const rows = [
        lite('h1', 'lp1', 50),   // stored out of range, live in range: kept
        lite('h2', 'lp2', 150),  // stored in range, live below min: dropped
        lite('h3', 'lp3', 150),  // live above max: dropped
        lite('h4', 'lp4', 999),  // live exactly min: kept
        lite('h5', 'lp5', 0),    // live exactly max: kept
    ];
    assert.deepEqual(ids(await priceSearchResults(rows, { dates: DATES, price: { min: 100, max: 200 } })), ['h1', 'h4', 'h5']);
    assert.deepEqual(ids(await priceSearchResults(rows, { dates: DATES, price: { min: 100 } })), ['h1', 'h3', 'h4', 'h5']);
    assert.deepEqual(ids(await priceSearchResults(rows, { dates: DATES, price: { max: 100 } })), ['h2', 'h4']);
});

test('unavailable keeps the stored min_price but still applies the range', async () => {
    quotes = { lp1: UNAVAILABLE, lp2: UNAVAILABLE };
    const result = await priceSearchResults(
        [lite('h1', 'lp1', 80), lite('h2', 'lp2', '120.50'), lite('h3', 'lp3', 130)],
        { dates: DATES, price: { min: 100 } },
    );
    // lp3 is missing from the map, which is treated the same as unavailable
    assert.deepEqual(result, [lite('h2', 'lp2', '120.50'), lite('h3', 'lp3', 130)]);
});

test('unavailable keeps the cheapest stored room in range, as search_hotels returns it', async () => {
    // Stored rooms at $90 and $180 with minPrice 150: min_price is 180, not 90, so the hotel stays listed
    quotes = { lp1: UNAVAILABLE };
    const result = await priceSearchResults([lite('h1', 'lp1', 180)], { dates: DATES, price: { min: 150 } });
    assert.deepEqual(result, [lite('h1', 'lp1', 180)]);
});

test('price-low and price-high are stable sorts over mixed rows', async () => {
    quotes = { lp1: live(100), lp2: live(60), lp3: live(100) };
    const rows = [
        owner('o1', 100),
        lite('h1', 'lp1', 300),
        owner('o2', '60'),
        lite('h2', 'lp2', 10),
        lite('h3', 'lp3', 100),
        owner('o3', 150),
    ];
    assert.deepEqual(ids(await priceSearchResults(rows, { dates: DATES, sort: 'price-low' })), ['o2', 'h2', 'o1', 'h1', 'h3', 'o3']);
    assert.deepEqual(ids(await priceSearchResults(rows, { dates: DATES, sort: 'price-high' })), ['o3', 'o1', 'h1', 'h3', 'o2', 'h2']);
});

test('recommended keeps the SQL order', async () => {
    quotes = { lp1: live(10), lp2: live(500) };
    const rows = [lite('h1', 'lp1', 300), owner('o1', 100), lite('h2', 'lp2', 20)];
    assert.deepEqual(ids(await priceSearchResults(rows, { dates: DATES, sort: 'recommended' })), ['h1', 'o1', 'h2']);
    assert.deepEqual(ids(await priceSearchResults(rows, { dates: DATES })), ['h1', 'o1', 'h2']);
});

test('if the rates helper throws, every row keeps its stored price', async () => {
    getFromPrices.mock.mockImplementationOnce(async () => {
        throw new Error('boom');
    });
    const rows = [lite('h1', 'lp1', 80), owner('o1', 120), lite('h2', 'lp2', 150)];
    const result = await priceSearchResults(rows, { dates: DATES, price: { min: 100 } });
    assert.deepEqual(result, [owner('o1', 120), lite('h2', 'lp2', 150)]);
    assert.equal(consoleWarn.mock.callCount(), 1);
});

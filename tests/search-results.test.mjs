// Which stays a search page shows and counts: app/search/results.ts over an in-memory search_hotels, with LiteAPI mocked.
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let hotels = [];
let quotes = {};
// Like search_hotels.sql: the place's LiteAPI ids or the city, the stored price range (LiteAPI hotels skip it with dates),
// stored-price sorts, then newest first, at most 100 rows
const searchAvailableHotels = mock.fn(async (f) => {
    const dated = Boolean(f.check_in && f.check_out);
    const inRange = (h) => (f.min_price == null || h.price >= f.min_price) && (f.max_price == null || h.price <= f.max_price);
    const order = (a, b) => (f.sort === 'price-low' ? a.price - b.price : f.sort === 'price-high' ? b.price - a.price : 0) || b.created - a.created;
    const matches = hotels
        .filter((h) => f.liteapi_ids?.includes(h.liteapi_id) || !f.city || h.city === f.city)
        .filter((h) => (h.liteapi_id && dated) || inRange(h))
        .sort(order);
    const offset = (f.page - 1) * f.page_size;
    const data = matches.slice(offset, offset + Math.min(f.page_size, 100))
        .map(({ id, liteapi_id, price }) => ({ id, name: id, liteapi_id, min_price: price, total_count: matches.length }));
    return { data, error: null, total: data[0]?.total_count ?? 0 };
});
const savedLiteapiIds = mock.fn(async (ids) => new Set(hotels.flatMap((h) => (ids.includes(h.liteapi_id) ? [h.liteapi_id] : []))));
const getFromPrices = mock.fn(async (ids) => new Map(ids.filter((id) => id in quotes).map((id) => [id, quotes[id]])));
mock.module('../utils/search.ts', { namedExports: { searchAvailableHotels } });
mock.module('../utils/liteapi-hotels.ts', { namedExports: { savedLiteapiIds } });
mock.module('../lib/liteapi/rates.ts', { namedExports: { getFromPrices } });

const { searchResults, PAGE_SIZE } = await import('../app/search/results.ts');

const DATES = { checkIn: '2099-06-10', checkOut: '2099-06-12' };
const owner = (id, created, price = 100, city = 'Paris') => ({ id, liteapi_id: null, city, created, price });
const lite = (n, created, price = 150, city = 'Paris') => ({ id: `h${n}`, liteapi_id: `lp${n}`, city, created, price });
const live = (perNight) => ({ status: 'live', value: { total: perNight * 2, perNight, offerId: 'o', rateName: '', boardType: 'RO', refundable: true, cancelBy: null, dueAtProperty: 0 } });
const place = (n) => ({
    hotels: Array.from({ length: n }, (_, i) => ({ id: `lp${i + 1}`, name: `Hotel lp${i + 1}`, country: 'fr', city: 'Paris', latitude: 0, longitude: 0 })),
    names: new Map(),
});
const keys = (rows) => rows.map((row) => row.id ?? row.liteapi_id);
const sqlCalls = () => searchAvailableHotels.mock.calls.map((call) => [call.arguments[0].page, call.arguments[0].page_size]);

async function everyPage(request, listing = null) {
    const shown = [];
    for (let page = 1; ; page++) {
        const { data } = await searchResults(request, page, listing);
        if (!data.length) return shown;
        shown.push(...keys(data));
    }
}

beforeEach(() => {
    hotels = [];
    quotes = {};
    searchAvailableHotels.mock.resetCalls();
    getFromPrices.mock.resetCalls();
});

test('a dates-only search pages every match in SQL, counts them all and streams the page\'s prices', async () => {
    hotels = [owner('o-old', 0), ...Array.from({ length: 150 }, (_, i) => lite(i + 1, i + 1))];
    quotes = Object.fromEntries(hotels.flatMap((h) => (h.liteapi_id ? [[h.liteapi_id, live(90)]] : [])));
    const last = Math.ceil(151 / PAGE_SIZE);
    const result = await searchResults({ ...DATES }, last, null);
    assert.equal(result.total, 151);
    assert.equal(result.capped, false);
    assert.deepEqual(keys(result.data), ['h3', 'h2', 'h1', 'o-old'], 'the owner listing older than the newest 100 is on the last page');
    assert.deepEqual(sqlCalls(), [[last, PAGE_SIZE]]);
    assert.deepEqual(result.data.map((row) => row.price_status), ['checking', 'checking', 'checking', undefined]);
    assert.deepEqual((await result.quoted).map((row) => row.min_price), [90, 90, 90, 100]);
    assert.deepEqual(getFromPrices.mock.calls[0].arguments[0], ['lp3', 'lp2', 'lp1'], 'only the page is quoted');
});

test('a dates-only search keeps a sold-out hotel in place, like a city search', async () => {
    hotels = [lite(1, 3), owner('o1', 2), lite(2, 1)];
    quotes = { lp1: { status: 'sold_out' }, lp2: live(120) };
    const result = await searchResults({ ...DATES }, 1, null);
    assert.equal(result.total, 3);
    assert.deepEqual((await result.quoted).map((row) => [row.id, row.min_price, row.price_status]), [
        ['h1', 150, 'sold-out'], ['o1', 100, undefined], ['h2', 120, undefined],
    ]);
});

test('with dates and a price sort, past 100 matches only the first 100 are priced and the count says so', async () => {
    hotels = Array.from({ length: 150 }, (_, i) => lite(i + 1, i + 1, 100 + i));
    quotes = Object.fromEntries(hotels.map((h) => [h.liteapi_id, live(500 - h.price)]));
    const result = await searchResults({ ...DATES, sort: 'price-low' }, 1, null);
    assert.equal(result.capped, true);
    assert.equal(result.total, 100);
    assert.deepEqual(sqlCalls(), [[1, 100]]);
    // The 100 cheapest stored prices (h1..h100), in live-price order
    assert.deepEqual(keys(result.data), Array.from({ length: PAGE_SIZE }, (_, i) => `h${100 - i}`));

    searchAvailableHotels.mock.resetCalls();
    hotels = hotels.slice(0, 80);
    const all = await searchResults({ ...DATES, maxPrice: '360' }, 1, null);
    assert.equal(all.capped, false, 'every match fit, so the count is the whole count');
    assert.equal(all.total, 40, 'live prices run from 400 down to 321');
});

test('with dates and a price range but no LiteAPI hotel among the candidates, SQL pages every match', async () => {
    hotels = [...Array.from({ length: 110 }, (_, i) => owner(`o${i + 1}`, 100 + i, 120)), lite(1, 1, 999)];
    quotes = { lp1: live(130) };
    const result = await searchResults({ ...DATES, maxPrice: '200' }, 6, null);
    assert.equal(result.total, 111);
    assert.equal(result.capped, false);
    assert.deepEqual(keys(result.data), ['o5', 'o4', 'o3', 'o2', 'o1', 'h1']);
    assert.deepEqual(sqlCalls(), [[1, 100], [6, PAGE_SIZE]]);
});

test('a city search keeps owner listings past the 100-row limit, in every sort', async () => {
    // An owner listing older than 110 saved LiteAPI hotels, and the cheapest by stored price; LiteAPI lists 60 of them
    hotels = [owner('o-paris', 0, 80), ...Array.from({ length: 110 }, (_, i) => lite(i + 1, i + 1, 150 + i)), owner('o-lyon', 5, 80, 'Lyon')];
    quotes = Object.fromEntries(hotels.flatMap((h) => (h.liteapi_id ? [[h.liteapi_id, live(200)]] : [])));
    for (const request of [{ where: 'Paris' }, { where: 'Paris', sort: 'price-high' }, { where: 'Paris', ...DATES, sort: 'price-high' }, { where: 'Paris', ...DATES }]) {
        const shown = await everyPage(request, place(60));
        assert.equal(shown.filter((key) => key === 'o-paris').length, 1, JSON.stringify(request));
        assert.equal(shown.length, 111, JSON.stringify(request));
        assert.equal(shown.includes('o-lyon'), false);
    }
    const first = await searchResults({ where: 'Paris' }, 1, place(60));
    assert.equal(first.total, 111);
    assert.equal(keys(first.data)[0], 'o-paris', 'owner listings come first');
});

test('a city search reads past the first 100 rows only when there are more', async () => {
    hotels = [owner('o1', 0), ...Array.from({ length: 250 }, (_, i) => lite(i + 1, i + 1))];
    await searchResults({ where: 'Paris' }, 1, place(60));
    assert.deepEqual(sqlCalls(), [[1, 100], [2, 100], [3, 100]]);
    assert.equal(searchAvailableHotels.mock.calls[2].arguments[0].liteapi_ids.length, 60);

    searchAvailableHotels.mock.resetCalls();
    hotels = hotels.slice(0, 100);
    await searchResults({ where: 'Paris' }, 1, place(60));
    assert.deepEqual(sqlCalls(), [[1, 100]]);

    searchAvailableHotels.mock.resetCalls();
    hotels = Array.from({ length: 1500 }, (_, i) => lite(i + 1, i + 1));
    await searchResults({ where: 'Paris' }, 1, place(60));
    assert.equal(searchAvailableHotels.mock.callCount(), 10, 'at most 1,000 rows');
});

test('without dates or a place, LiteAPI hotels ask for dates, and a price range or sort leaves them out or last', async () => {
    hotels = [lite(1, 4, 89), owner('o1', 3, 120), lite(2, 2, 140), owner('o2', 1, 60)];
    const plain = await searchResults({}, 1, null);
    assert.equal(plain.total, 4);
    assert.deepEqual(plain.data.map((row) => [row.id, row.min_price, row.price_status]), [
        ['h1', null, 'needs-dates'], ['o1', 120, undefined], ['h2', null, 'needs-dates'], ['o2', 60, undefined],
    ]);
    assert.deepEqual(sqlCalls(), [[1, PAGE_SIZE]]);

    const ranged = await searchResults({ maxPrice: '150' }, 1, null);
    assert.deepEqual(keys(ranged.data), ['o1', 'o2']);
    assert.equal(ranged.total, 2);

    assert.deepEqual(keys((await searchResults({ sort: 'price-low' }, 1, null)).data), ['o2', 'o1', 'h1', 'h2']);
    assert.deepEqual(keys((await searchResults({ sort: 'price-high' }, 1, null)).data), ['o1', 'o2', 'h2', 'h1']);
    assert.equal(getFromPrices.mock.callCount(), 0);
});

test('without dates or a place, past 100 matches a price sort pages in SQL and puts LiteAPI hotels last on the page', async () => {
    hotels = Array.from({ length: 120 }, (_, i) => (i % 2 ? owner(`o${i}`, i, 100 + i) : lite(i, i, 100 + i)));
    const result = await searchResults({ sort: 'price-low' }, 1, null);
    assert.equal(result.total, 120);
    assert.deepEqual(sqlCalls(), [[1, 100], [1, PAGE_SIZE]]);
    const owners = result.data.filter((row) => !row.liteapi_id);
    assert.deepEqual(keys(owners), ['o1', 'o3', 'o5', 'o7', 'o9', 'o11', 'o13', 'o15', 'o17', 'o19']);
    assert.deepEqual(keys(result.data.slice(0, owners.length)), keys(owners));
    assert.ok(result.data.slice(owners.length).every((row) => row.price_status === 'needs-dates' && row.min_price === null));
});

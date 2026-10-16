// Search results for a place from LiteAPI: app/search/liveSearch.ts and quotePage, with getFromPrices mocked.
import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let quotes = {};
const getFromPrices = mock.fn(async (ids) => new Map(ids.filter((id) => id in quotes).map((id) => [id, quotes[id]])));
mock.module('../lib/liteapi/rates.ts', { namedExports: { getFromPrices } });

const { listingRow, mergeLiveResults, withoutDates } = await import('../app/search/liveSearch.ts');
const { priceSearchResults, quotePage, sortByPrice } = await import('../app/search/livePrices.ts');

const NAMES = new Map([[2, 'Parking'], [107, 'Free WiFi']]);
const listing = (id, more = {}) => ({ id, name: `Hotel ${id}`, country: 'fr', city: 'Paris', latitude: 0, longitude: 0, stars: 4, ...more });
const owner = (id, price) => ({ id, name: id, min_price: price, liteapi_id: null });
const saved = (id, liteapiId, price) => ({ id, name: id, min_price: price, liteapi_id: liteapiId, description: 'From the database' });
const keys = (rows) => rows.map((row) => row.id ?? row.liteapi_id);
const live = (perNight) => ({ status: 'live', value: { total: perNight * 2, perNight, offerId: 'o', rateName: '', boardType: 'RO', refundable: true, cancelBy: null, dueAtProperty: 0 } });
const DATES = { checkIn: '2099-06-10', checkOut: '2099-06-12' };

beforeEach(() => {
    quotes = {};
    getFromPrices.mock.resetCalls();
});

test('listingRow turns a LiteAPI hotel into a search card', () => {
    const row = listingRow(listing('lp1', {
        hotelDescription: '<p>Near the <b>Louvre</b></p>', address: '1 Rue X', main_photo: 'https://img/1.jpg', facilityIds: [2, 21, 107],
    }), NAMES);
    assert.deepEqual(row, {
        liteapi_id: 'lp1', name: 'Hotel lp1', description: 'Near the Louvre', address: '1 Rue X', city: 'Paris', country: 'France',
        photo_urls: ['https://img/1.jpg'], rating: 4, tags: ['Parking', 'Free Wi-Fi', 'Families', 'Kids'], min_price: null,
    });
    assert.deepEqual(listingRow(listing('lp3', { facilityIds: [21, 149] }), NAMES).tags, ['Couples'], 'adults-only drops Kids and Families');
    assert.equal(listingRow(listing('lp2', { stars: 0, country: 'US' }), NAMES).rating, null);
    assert.equal(listingRow(listing('lp2', { country: 'US' }), NAMES).country, 'United States');
});

test('owner listings come first, then LiteAPI hotels in LiteAPI order, then saved ones LiteAPI did not list', () => {
    const db = [saved('s-old', 'lp-old', 90), owner('o1', 200), saved('s2', 'lp2', 150)];
    const rows = mergeLiveResults(db, [listing('lp1'), listing('lp2'), listing('lp3')], new Set(['lp2', 'lp-old']), NAMES, {});
    assert.deepEqual(keys(rows), ['o1', 'lp1', 's2', 'lp3', 's-old']);
    const fromDb = rows.find((row) => row.id === 's2');
    assert.equal(fromDb.description, 'From the database');
    assert.equal(fromDb.rating, 4, 'stars come from LiteAPI, since search_hotels has none');
    assert.equal(fromDb.min_price, 150);
});

test('a saved hotel the database filtered out stays out', () => {
    const rows = mergeLiveResults([], [listing('lp1'), listing('lp2')], new Set(['lp1']), NAMES, {});
    assert.deepEqual(keys(rows), ['lp2']);
});

test('unsaved hotels are filtered on what the list knows', () => {
    const hotels = [
        listing('pool', { facilityIds: [103] }),
        listing('plain', { facilityIds: [] }),
        listing('adults', { facilityIds: [103, 149] }),
        listing('two-star', { facilityIds: [103], stars: 2 }),
    ];
    const merge = (p) => keys(mergeLiveResults([], hotels, new Set(), NAMES, p));
    assert.deepEqual(merge({ tags: ['Pool'] }), ['pool', 'adults', 'two-star']);
    assert.deepEqual(merge({ guests: { adults: 2, children: 1, total: 3 } }), ['pool', 'plain', 'two-star'], 'adults-only hotels drop out for kids');
    assert.deepEqual(merge({ rating: { minStars: 3 } }), ['pool', 'plain', 'adults']);
    assert.deepEqual(merge({ beds: { size: 'King' } }), [], 'bed filters need rooms, which unsaved hotels lack');
    assert.deepEqual(merge({ tags: ['Cribs'] }), [], 'cribs need rooms too');
});

test('without dates LiteAPI hotels ask for dates, and a price filter or sort leaves them out or last', () => {
    const rows = [saved('s1', 'lp1', 80), owner('o1', 300), { liteapi_id: 'lp2', min_price: null }, owner('o2', 100)];
    assert.deepEqual(withoutDates(rows, {}).map((row) => [row.id ?? row.liteapi_id, row.min_price, row.price_status]), [
        ['s1', null, 'needs-dates'], ['o1', 300, undefined], ['lp2', null, 'needs-dates'], ['o2', 100, undefined],
    ]);
    assert.deepEqual(keys(withoutDates(rows, { price: { max: 500 } })), ['o1', 'o2']);
    assert.deepEqual(keys(withoutDates(rows, { sort: 'price-low' })), ['o2', 'o1', 's1', 'lp2']);
});

test('sortByPrice puts stays without a price last both ways', () => {
    const rows = [{ id: 'none', min_price: null }, { id: 'a', min_price: 50 }, { id: 'b', min_price: '200' }];
    assert.deepEqual(keys(sortByPrice(rows, 'price-high')), ['b', 'a', 'none']);
    assert.deepEqual(keys(sortByPrice(rows, 'price-low')), ['a', 'b', 'none']);
    assert.equal(sortByPrice(rows, 'recommended'), rows);
});

test('quotePage fills in prices, keeps sold-out hotels in place and never reorders', async () => {
    quotes = { lp1: live(120), lp2: { status: 'sold_out' }, lp3: { status: 'unavailable' } };
    const rows = [{ liteapi_id: 'lp1', min_price: null }, owner('o1', 90), { liteapi_id: 'lp2', min_price: null },
        { liteapi_id: 'lp3', min_price: null }, saved('s4', 'lp4', 70)];
    const out = await quotePage(rows, { dates: DATES, guests: { adults: 2, children: 1 } });
    assert.deepEqual(out.map((row) => [row.id ?? row.liteapi_id, row.min_price, row.price_status]), [
        ['lp1', 120, undefined], ['o1', 90, undefined], ['lp2', null, 'sold-out'], ['lp3', null, 'unavailable'], ['s4', 70, undefined],
    ]);
    assert.equal(getFromPrices.mock.callCount(), 1);
    assert.deepEqual(getFromPrices.mock.calls[0].arguments[1], { ...DATES, adults: 2, children: [8] });
});

test('a price range drops LiteAPI hotels with no price, and the rest sort with no price last', async () => {
    quotes = { lp1: live(120), lp2: { status: 'unavailable' } };
    const rows = [{ liteapi_id: 'lp1', min_price: null }, { liteapi_id: 'lp2', min_price: null }, owner('o1', 90)];
    assert.deepEqual(keys(await priceSearchResults(rows, { dates: DATES, price: { max: 500 } })), ['lp1', 'o1']);
    const sorted = await priceSearchResults(rows, { dates: DATES, sort: 'price-high' });
    assert.deepEqual(sorted.map((row) => [row.id ?? row.liteapi_id, row.price_status]), [['lp1', undefined], ['o1', undefined], ['lp2', 'unavailable']]);
});

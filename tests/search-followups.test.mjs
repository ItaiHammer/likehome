// Follow-ups to PR #78: strict dates, plain numbers, rating cap.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

mock.module('../utils/search.ts', { namedExports: { searchAvailableHotels: mock.fn(async () => ({})) } });
const { search } = await import('../app/search/search.ts');

test('impossible dates are ignored instead of rolling over (Feb 30 is not Mar 2)', async () => {
    const { params } = await search({ checkIn: '2099-02-30', checkOut: '2099-03-05' });
    // check-in is invalid, so it's derived from check-out (the night before)
    assert.deepEqual(params.dates, { checkIn: '2099-03-04', checkOut: '2099-03-05' });
});

test('ISO timestamps still work', async () => {
    const { params } = await search({ checkIn: '2099-06-15T00:00:00.000Z', checkOut: '2099-06-20T00:00:00.000Z' });
    assert.deepEqual(params.dates, { checkIn: '2099-06-15', checkOut: '2099-06-20' });
});

test('hex, exponents and Infinity are not numbers', async () => {
    for (const value of ['0x10', '1e3', 'Infinity', '1.2.3']) {
        const { params } = await search({ minPrice: value });
        assert.equal(params.price, undefined, value);
    }
});

test('plain decimals and negatives still behave as before', async () => {
    assert.deepEqual((await search({ minPrice: '49.99' })).params.price, { min: 49.99 });
    assert.deepEqual((await search({ minPrice: '-5' })).params.price, { min: 0 });
});

test('rating is capped at 5', async () => {
    assert.deepEqual((await search({ minRating: '10' })).params.rating, { minStars: 5 });
    assert.deepEqual((await search({ minRating: '4.5' })).params.rating, { minStars: 4.5 });
});

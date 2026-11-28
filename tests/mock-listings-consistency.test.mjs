import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readSampleListing, readSampleListings, saveSampleListing} from '../app/listings/_components/sample-listings.ts';
import {mockListings} from '../app/listings/mock/data.ts';
import {sampleHistory} from '../app/property-dashboard/customers/mockCustomerData.ts';
import {calendarProperties, calendarStays, calendarDay} from '../lib/owner-calendar.ts';

function withStorage(run) {
  const original = globalThis.window;
  const data = new Map();
  globalThis.window = {localStorage: {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  }};
  try { return run(data); } finally { globalThis.window = original; }
}

test('sample edits appear in both listing rows and the dashboard preview reader', () => withStorage(() => {
  const original = mockListings[0];
  const edited = {...original, description: 'Updated coastal description', rooms: [...original.rooms]};
  saveSampleListing(edited, false);
  assert.equal(readSampleListing(original.id)?.description, edited.description);
  assert.equal(readSampleListings(mockListings)[0].description, edited.description);
  assert.equal(mockListings[0].description, original.description); // never mutate bundled fixtures
}));

test('new sample properties survive navigation and can be reopened in the editor', () => withStorage(() => {
  const created = {...mockListings[0], id: 'mock-created-123', name: 'Sample QA Place'};
  saveSampleListing(created, true);
  assert.equal(readSampleListings(mockListings).at(-1)?.id, created.id);
  assert.equal(readSampleListing(created.id)?.name, created.name);
  saveSampleListing({...created, name: 'Edited sample QA'}, false);
  assert.equal(readSampleListings(mockListings).at(-1)?.name, 'Edited sample QA');
  assert.equal(readSampleListings(mockListings).length, mockListings.length + 1);
}));

test('sample reader ignores corrupt storage and non-sample IDs', () => withStorage((data) => {
  data.set('likehome:mock-listing:mock-harbor-house', 'not-json');
  data.set('likehome:mock-listings:created', JSON.stringify(['not-sample', 'mock-created-404']));
  assert.equal(readSampleListing('real-uuid'), null);
  assert.equal(readSampleListings(mockListings).length, mockListings.length);
}));

test('sample calendar and customer history use the same hotel IDs and reservation records', () => {
  const history = sampleHistory('');
  const listingIds = new Set(mockListings.map((l) => l.id));
  assert.ok(history.bookings.length > 7);
  assert.ok(history.listings.every((l) => listingIds.has(l.id)));
  assert.ok(history.bookings.every((b) => listingIds.has(b.hotelId)));
  const sarah = history.bookings.find((b) => b.id === 'mock-reservation-1');
  assert.ok(sarah);
  const stays = calendarStays(history.bookings);
  const rooms = calendarProperties(mockListings).find((p) => p.id === sarah.hotelId)?.rooms;
  assert.ok(calendarDay('2026-12-20', stays.filter((s) => s.hotelId === sarah.hotelId), rooms).staying.some((s) => s.id === sarah.id));
  assert.ok(!stays.some((s) => s.id === 'mock-reservation-2')); // cancelled excluded
});

test('sample message recipients and sent messages reference the same listing IDs', async () => {
  const {previewProperties, previewRecipientsByHotel, previewSentMessages} =
    await import('../app/property-dashboard/messages/mockOwnerMessages.ts');
  const ids = new Set(mockListings.map((l) => l.id));
  assert.ok(previewProperties.every((property) => ids.has(property.id)));
  assert.ok(Object.keys(previewRecipientsByHotel).every((id) => ids.has(id)));
  assert.ok(previewSentMessages.every((message) => ids.has(message.hotel_id)));
});

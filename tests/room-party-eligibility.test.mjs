import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomFits, matchingRoom } from '../lib/stay-filters.ts';
import { roomOptionEligibility, exceedsHotelGuestLimit } from '../lib/room-eligibility.ts';

test('a party of 13 adults cannot select rooms sleeping 2, 2, 6, or 4', () => {
  const rooms = [2,2,6,4].map((sleeps, i) => ({id: String(i), sleeps, nightly: 200+i, soldOut: false}));
  assert.ok(rooms.every((r) => !roomFits(r, 13, 13, 0)));
  assert.ok(rooms.every((r) => roomOptionEligibility(r, { adults: 13, children: 0 }).tooSmall));
  assert.ok(rooms.every((r) => roomOptionEligibility(r, { adults: 13, children: 0 }).disabled));
  assert.equal(matchingRoom(rooms, [], {guests: 13, adults: 13, children: 0, tags: []}), null);
});

test('changing to a party of 2 makes a two-guest room eligible again', () => {
  const rooms = [{id:'a', sleeps:2, nightly:100, soldOut:false}, {id:'b', sleeps:6, nightly:150, soldOut:false}];
  assert.equal(matchingRoom(rooms, [], {guests:2, adults:2, children:0, tags:[]})?.id, 'a');
  assert.equal(roomOptionEligibility(rooms[0], {adults: 2, children: 0}).disabled, false);
});

test('a guest increase beyond the largest hotel room is refused, but smaller parties may increase', () => {
  assert.equal(exceedsHotelGuestLimit(5, 2, 7), false);
  assert.equal(exceedsHotelGuestLimit(6, 2, 7), true);
  assert.equal(exceedsHotelGuestLimit(5, 3, 7), true);
  assert.equal(exceedsHotelGuestLimit(3, 1, 6), false);
  assert.equal(exceedsHotelGuestLimit(6, 2), false); // no cap passed: existing selection behavior
});

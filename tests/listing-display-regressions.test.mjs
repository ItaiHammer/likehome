import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stayDisplayName } from '../app/_components/stayDisplayName.ts';
import { displayRoomName, displayRoomType, displayRoomDetails, displayRoomOptions } from '../app/reserve/[slug]/roomDisplay.ts';

test('a real hotel name beginning with New is preserved', () => {
  assert.equal(stayDisplayName('New York Marriott Marquis'), 'New York Marriott Marquis');
  assert.equal(stayDisplayName('New Orleans Hotel - Near Airport'), 'New Orleans Hotel - Near Airport');
  assert.equal(stayDisplayName('New! - Harbor House'), 'Harbor House');
  assert.equal(stayDisplayName('HOT DEAL: Harbor House - Perfect for Families'), 'Harbor House');
  assert.equal(stayDisplayName('Seaside Lodge - Perfect for Couples'), 'Seaside Lodge');
  assert.equal(stayDisplayName('Seaside Lodge perfect for couples'), 'Seaside Lodge');
});

test('room cards split details, but summaries retain the full room name', () => {
  const room = 'Guest room, 1 King Bed, Hearing Accessible, City View (No Resort Fee)';
  assert.equal(displayRoomType(room), 'Guest room');
  assert.equal(displayRoomDetails(room), '1 King Bed, Hearing Accessible, City View');
  assert.equal(displayRoomName(room), 'Guest room, 1 King Bed, Hearing Accessible, City View');
  assert.equal(displayRoomName('Suite, Ocean View (No Resort Fees)'), 'Suite, Ocean View');
  assert.equal(displayRoomName('Owner King Suite'), 'Owner King Suite');
  assert.equal(displayRoomDetails('Owner King Suite'), '');
});

test('rooms with different amenity tags remain separate selectable cards', () => {
  const basic = { id: 'a', name: 'Standard room', nightly: 150, sleeps: 2, description: '', tags: ['Free Wi-Fi'] };
  const kitchen = { ...basic, id: 'b', tags: ['Kitchen'] };
  const duplicate = { ...basic, id: 'c', tags: ['Free Wi-Fi'] };
  assert.deepEqual(displayRoomOptions([basic, kitchen], 'a').map(({ id }) => id), ['a', 'b']);
  assert.equal(displayRoomOptions([basic, duplicate], 'a').length, 1);
});

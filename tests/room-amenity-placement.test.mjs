import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomAmenityList, roomOnlyAmenities, propertyWideOffers, commonRoomAmenities } from '../lib/stay-filters.ts';

test('only property-wide amenities appear in the listing Amenities section', () => {
  // Kitchen appears on one room only; it must not be advertised as a hotel-wide feature.
  const hotelTags = ['Parking', 'Pool', 'Pets', 'Free Wi-Fi'];
  assert.deepEqual(propertyWideOffers(hotelTags), [
    { label: 'Parking' }, { label: 'Pool' }, { label: 'Free Wi-Fi' },
  ]);
  assert.ok(!propertyWideOffers(['Parking']).some(({ label }) => label === 'Kitchen'));
});

test('room cards display only the room-specific amenity tags, in canonical order', () => {
  const firstRoomTags = ['Kitchen', 'ADA Compliant', 'Pool', 'Pets', 'Housekeeping'];
  const secondRoomTags = ['Free Wi-Fi'];
  assert.deepEqual(roomAmenityList(firstRoomTags), ['ADA Compliant', 'Kitchen', 'Housekeeping']);
  assert.deepEqual(roomAmenityList(secondRoomTags), ['Free Wi-Fi']);
  assert.deepEqual(roomAmenityList([]), []);
});


test('amenities shared by every room type move to property Amenities and disappear from room cards', () => {
  const rooms = [
    ['Free Wi-Fi', 'Housekeeping', 'ADA Compliant'],
    ['Free Wi-Fi', 'Housekeeping', 'Kitchen'],
    ['Free Wi-Fi', 'Housekeeping'],
  ];
  const shared = commonRoomAmenities(rooms);
  assert.deepEqual(shared, ['Free Wi-Fi', 'Housekeeping']);
  assert.deepEqual(propertyWideOffers(['Parking'], rooms), [
    { label: 'Parking' },
    { label: 'Free Wi-Fi' },
    { label: 'Housekeeping' },
  ]);
  assert.deepEqual(roomAmenityList(rooms[0]).filter((name) => !shared.includes(name)), ['ADA Compliant']);
  assert.deepEqual(roomAmenityList(rooms[1]).filter((name) => !shared.includes(name)), ['Kitchen']);
  assert.deepEqual(roomAmenityList(rooms[2]).filter((name) => !shared.includes(name)), []);
});

test('not all rooms list an amenity, so it remains room-specific', () => {
  const rooms = [['Free Wi-Fi'], ['Kitchen'], null];
  assert.deepEqual(commonRoomAmenities(rooms), []);
  assert.deepEqual(propertyWideOffers([], rooms), []);
  assert.deepEqual(commonRoomAmenities([]), []);
});

test('already-property-wide amenities are not duplicated when also shared by all rooms', () => {
  assert.deepEqual(propertyWideOffers(['Free Wi-Fi', 'Parking'], [['Free Wi-Fi'], ['Free Wi-Fi']]), [
    { label: 'Parking' }, { label: 'Free Wi-Fi' },
  ]);
});


test('property-wide amenities never repeat on room cards, even if only one room has a duplicate tag', () => {
  const propertyTags = ['Free Wi-Fi', 'Parking'];
  const roomTags = [
    ['Free Wi-Fi', 'Kitchen', 'Housekeeping'],
    ['ADA Compliant'],
  ];
  const propertyLabels = propertyWideOffers(propertyTags, roomTags).map(({ label }) => label);
  assert.ok(propertyLabels.includes('Free Wi-Fi'));
  assert.deepEqual(roomOnlyAmenities(roomTags[0], propertyLabels), ['Kitchen', 'Housekeeping']);
  assert.deepEqual(roomOnlyAmenities(roomTags[1], propertyLabels), ['ADA Compliant']);
});

test('shared room amenities move to property list and are removed from all room cards', () => {
  const rooms = [
    ['Free Wi-Fi', 'Housekeeping', 'Kitchen'],
    ['Free Wi-Fi', 'Housekeeping', 'ADA Compliant'],
    ['Free Wi-Fi', 'Housekeeping'],
  ];
  const propertyLabels = propertyWideOffers(['Parking'], rooms).map(({ label }) => label);
  assert.deepEqual(roomOnlyAmenities(rooms[0], propertyLabels), ['Kitchen']);
  assert.deepEqual(roomOnlyAmenities(rooms[1], propertyLabels), ['ADA Compliant']);
  assert.deepEqual(roomOnlyAmenities(rooms[2], propertyLabels), []);
});

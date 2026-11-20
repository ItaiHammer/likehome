import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateHotelInfo,
  publicationProblem,
  isValidCountry,
  checkRoomForm,
  readListingDraft,
  readPhotos,
} from '../lib/validation/listing.ts';

const validInfo = {
  name: 'Harbor House',
  propertyType: 'hotel',
  streetAddress: '100 Coastal Way',
  city: 'Monterey',
  region: 'California',
  postalCode: '93940',
  country: 'United States',
  description: 'A coastal property.',
};

test('valid listing information passes shared validation', () => {
  assert.deepEqual(validateHotelInfo(validInfo), {});
});

test('mandatory property identity and address fields cannot be blank', () => {
  const errors = validateHotelInfo({ ...validInfo, name: '  ', streetAddress: '', city: '', country: '' });
  assert.equal(errors.name, 'Enter a property name');
  assert.equal(errors.streetAddress, 'Enter a street address');
  assert.equal(errors.city, 'Enter a city');
  assert.equal(errors.country, 'Enter a country');
});

test('unrecognized property types are refused, including server-side submissions', () => {
  assert.match(validateHotelInfo({ ...validInfo, propertyType: 'spaceship' }).propertyType, /valid property type/);
});

test('free-text country must name a recognized country or accepted code', () => {
  for (const country of ['United States', 'USA', 'Japan', 'Germany', 'Brazil', 'CA']) {
    assert.equal(isValidCountry(country), true, country);
  }
  for (const country of ['Narnia', 'Atlantis', 'Exampleland']) {
    assert.equal(isValidCountry(country), false, country);
    assert.match(validateHotelInfo({ ...validInfo, country }).country, /valid country/);
  }
});

test('postal codes reject symbols, but support letters and hyphens internationally', () => {
  assert.equal(validateHotelInfo({ ...validInfo, postalCode: '95112' }).postalCode, undefined);
  assert.equal(validateHotelInfo({ ...validInfo, country: 'United Kingdom', region: 'Greater London', postalCode: 'SW1A 1AA' }).postalCode, undefined);
  assert.equal(validateHotelInfo({ ...validInfo, country: 'Canada', region: 'Quebec', postalCode: 'H2Y-1C6' }).postalCode, undefined);
  assert.match(validateHotelInfo({ ...validInfo, postalCode: 'abc!!!' }).postalCode, /letters, numbers/);
});

test('listing field length caps are enforced', () => {
  assert.match(validateHotelInfo({ ...validInfo, name: 'A'.repeat(101) }).name, /100/);
  assert.match(validateHotelInfo({ ...validInfo, description: 'X'.repeat(2001) }).description, /2000/);
});

test('room entries reject bad capacities, prices, and missing beds', () => {
  const base = { roomType: 'King', bedConfiguration: '1 king bed', maxGuests: '2', roomCount: '2', nightlyRate: '189.00', description: '' };
  assert.ok(checkRoomForm(base).room);
  assert.match(checkRoomForm({ ...base, maxGuests: '0' }).errors.maxGuests, /1 to 20/);
  assert.match(checkRoomForm({ ...base, roomCount: '0' }).errors.roomCount, /1 to 500/);
  assert.match(checkRoomForm({ ...base, nightlyRate: '-1' }).errors.nightlyRate, /at least/);
  assert.match(checkRoomForm({ ...base, bedConfiguration: '0 king beds' }).errors.bedConfiguration, /at least 1 bed/);
});

test('malformed photo URLs and rooms are rejected before backend writes', () => {
  assert.equal(readPhotos([{ id: 'photo1', url: 'javascript:alert(1)', caption: '' }]), null);
  assert.equal(readListingDraft({ ...validInfo, amenities: [], photos: [], rooms: [{ id: 'invalid', roomType: 'King', nightlyRateCents: -100 }] }), null);
});


test('a valid property type, country and address survive normalized server-side parsing', () => {
  const draft = readListingDraft({
    ...validInfo, name: '  Harbor House  ', country: 'Germany',
    amenities: ['wifi', 'wifi', 'fictional'], photos: [], rooms: [],
  });
  assert.equal(draft.name, 'Harbor House');
  assert.equal(draft.country, 'Germany');
  assert.deepEqual(draft.amenities, ['wifi']);
  assert.deepEqual(validateHotelInfo(draft), {});
});

test('duplicate room/photo identifiers are rejected by shared server parsing', () => {
  const room = {
    id: 'room1', roomType: 'King', bedConfiguration: '1 king bed',
    maxGuests: 2, roomCount: 2, nightlyRateCents: 18900, description: '',
  };
  const photo = { id: 'photo1', url: '/listings/samples/exterior.svg', caption: '' };
  assert.equal(readListingDraft({ ...validInfo, rooms: [room, room], photos: [], amenities: [] }), null);
  assert.equal(readPhotos([photo, photo]), null);
});

test('room validation refuses huge values and impossible prices', () => {
  const room = { roomType: 'Suite', bedConfiguration: '1 king bed', maxGuests: '2', roomCount: '1', nightlyRate: '100.00', description: '' };
  assert.match(checkRoomForm({ ...room, nightlyRate: '0.50' }).errors.nightlyRate, /at least/);
  assert.match(checkRoomForm({ ...room, nightlyRate: '999999999' }).errors.nightlyRate, /at least/);
  assert.match(checkRoomForm({ ...room, roomCount: '501' }).errors.roomCount, /1 to 500/);
  assert.match(checkRoomForm({ ...room, maxGuests: '21' }).errors.maxGuests, /1 to 20/);
});


test('state or region is required and US/Canada subdivisions are checked', () => {
  assert.match(validateHotelInfo({ ...validInfo, region: '' }).region, /state or region/);
  assert.equal(validateHotelInfo({ ...validInfo, region: 'CA' }).region, undefined);
  assert.match(validateHotelInfo({ ...validInfo, region: 'Atlantis' }).region, /valid U.S. state/);
  assert.equal(validateHotelInfo({ ...validInfo, country: 'Canada', region: 'Ontario', postalCode: 'K1A 0B1' }).region, undefined);
  assert.match(validateHotelInfo({ ...validInfo, country: 'Canada', region: 'California', postalCode: 'K1A 0B1' }).region, /Canadian province/);
});

test('postal code must be supplied, and format matches US/Canadian rules', () => {
  assert.match(validateHotelInfo({ ...validInfo, postalCode: '' }).postalCode, /postal code/);
  assert.match(validateHotelInfo({ ...validInfo, postalCode: 'ABC123' }).postalCode, /ZIP code/);
  assert.equal(validateHotelInfo({ ...validInfo, postalCode: '95112-1234' }).postalCode, undefined);
  assert.match(validateHotelInfo({ ...validInfo, postalCode: '95112!' }).postalCode, /letters, numbers/);
  assert.equal(validateHotelInfo({ ...validInfo, country: 'Germany', region: 'Bavaria', postalCode: '80331' }).postalCode, undefined);
});

test('publishing requires at least one photo and one room, in that order', () => {
  const room = { id: 'room1', roomType: 'King', bedConfiguration: '1 king bed', maxGuests: 2, roomCount: 1, nightlyRateCents: 18900, description: '' };
  const photo = { id: 'photo1', url: '/listings/samples/exterior.svg', caption: 'Hotel exterior' };
  assert.equal(publicationProblem({ photos: [], rooms: [] })?.tab, 'photos');
  assert.equal(publicationProblem({ photos: [photo], rooms: [] })?.tab, 'rooms');
  assert.equal(publicationProblem({ photos: [photo], rooms: [room] }), null);
});

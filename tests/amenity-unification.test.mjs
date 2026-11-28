import { test } from 'node:test';
import assert from 'node:assert/strict';
import { propertyAmenities, roomAmenities, displayAmenityLabel } from '../app/search/types.ts';
import { AMENITIES } from '../types/listing.ts';
import { amenitiesToTags, amenitiesFromTags } from '../lib/listing-storage.ts';
import { checkRoomForm, readRooms } from '../lib/validation/listing.ts';
import { editorReducer, initEditorState, hasRoomEdits } from '../app/listings/_components/editor-state.ts';
import { groupRoomRows, planRoomChanges, roomAmenitiesFromTags, mergeRoomAmenityTags } from '../lib/listing-rooms.ts';
import { commonRoomAmenities, propertyWideOffers, roomOnlyAmenities } from '../lib/stay-filters.ts';

test('search options stay the same; the editor matches visible labels', async () => {
  assert.deepEqual(propertyAmenities, ['Washer & Dryer','Parking','EV Charging','Free Meals','Pool','Gym','Gift Shops','Cribs']);
  assert.deepEqual(roomAmenities, ['ADA Compliant','Kitchen','Free Wi-Fi','Housekeeping']);
  assert.equal(displayAmenityLabel('Gym'), 'Fitness center');
  assert.equal(displayAmenityLabel('ADA Compliant'), 'Accessible');
  const { AMENITY_LABELS } = await import('../lib/listing-display.ts');
  assert.equal(AMENITY_LABELS.fitness_center,'Fitness center');
  assert.equal(AMENITY_LABELS.wifi,'Free Wi-Fi');
  assert.deepEqual(amenitiesToTags(['fitness_center','wifi']), ['Free Wi-Fi','Gym']);
  assert.deepEqual(amenitiesFromTags(['Fitness center','Wi-Fi']), ['wifi','fitness_center']);
});

test('room feature selection survives editing validation and draft serialization', () => {
  let state = initEditorState({ tab: 'rooms' });
  state = editorReducer(state, {type: 'openRoom'});
  assert.equal(hasRoomEdits(state), false);
  state = editorReducer(state, {type: 'toggleRoomAmenity', amenity: 'Microwave', checked: true});
  state = editorReducer(state, {type: 'toggleRoomAmenity', amenity: 'Free Wi-Fi', checked: true});
  assert.deepEqual(state.roomEditor.form.amenities, ['Microwave','Free Wi-Fi']);
  assert.equal(hasRoomEdits(state), true);
  const form = {...state.roomEditor.form,roomType:'Ocean King',bedConfiguration:'1 King bed',maxGuests:'2',roomCount:'2',nightlyRate:'199'};
  const validated = checkRoomForm(form);
  assert.deepEqual(validated.errors, {});
  assert.deepEqual(validated.room.amenities, ['Microwave','Free Wi-Fi']);
  const draft = { id:'o1', ...validated.room };
  assert.deepEqual(readRooms([draft])[0].amenities, ['Microwave','Free Wi-Fi']);
});

test('rooms with different amenities do not collapse together; saving edits preserves room IDs', () => {
 const row = (id,tags) => ({id,hotel_id:'h',room_type:'King',price_per_night:189,capacity:2,num_beds:1,bed_size:'King',tags,created_at:'2026-01-01'});
 const rows = [row('a',['Microwave']), row('b',['Refrigerator']), row('c',['Microwave'])];
 const groups = groupRoomRows(rows);
 assert.equal(groups.length,2);
 assert.equal(groups[0].room.roomCount,2);
 assert.deepEqual(groups[0].room.amenities,['Microwave']);
 assert.deepEqual(groups[1].room.amenities,['Refrigerator']);
 const edited = groups.map(g => g.room);
 edited[0] = {...edited[0], amenities:['Microwave','Roll-in shower']};
 const changes = planRoomChanges(rows,edited);
 assert.equal(changes.update.length,1);
 assert.deepEqual(changes.update[0].ids,['a','c']);
 assert.deepEqual(changes.update[0].tags,['Microwave','Roll-in shower']);
 assert.deepEqual(changes.insert,[]);
 assert.deepEqual(changes.remove,[]);
});

test('old unrelated room tags remain and only edited known features change', () => {
 assert.deepEqual(roomAmenitiesFromTags(['ADA Compliant','Kitchen / Kitchenette']),['Kitchen','ADA Compliant']);
 assert.deepEqual(mergeRoomAmenityTags(['Pool','Microwave'],['Refrigerator']),['Pool','Refrigerator']);
});

test('amenities common to every room show only in the property section', () => {
 const rooms = [['Free Wi-Fi','Housekeeping','Microwave'], ['Free Wi-Fi','Housekeeping','Refrigerator']];
 assert.deepEqual(commonRoomAmenities(rooms),['Free Wi-Fi','Housekeeping']);
 const property = propertyWideOffers(['Parking'],rooms).map(o => o.label);
 assert.deepEqual(roomOnlyAmenities(rooms[0],property),['Microwave']);
 assert.deepEqual(roomOnlyAmenities(rooms[1],property),['Refrigerator']);
});

test('SQL migration updates and inserts room tags without replacing booked room IDs', async () => {
 const {readFile} = await import('node:fs/promises');
 const sql = await readFile(new URL('../supabase/migrations/20261127_owner_room_amenities.sql', import.meta.url),'utf8');
 assert.match(sql,/tags = case when v_item \? 'tags'/);
 assert.match(sql,/update public\.rooms/);
 assert.match(sql,/insert into public\.rooms/);
 assert.match(sql,/jsonb_array_elements_text\(item -> 'tags'\)/);
});

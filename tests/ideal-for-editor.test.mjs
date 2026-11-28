import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readIdealFor, readListingDraft } from '../lib/validation/listing.ts';
import { idealForFromTags, mergeAmenityTags, mergeIdealForTags, amenitiesFromTags } from '../lib/listing-storage.ts';
import { editorReducer, initEditorState, changedTabs } from '../app/listings/_components/editor-state.ts';

test('every traveler category is accepted and normalized, unknown values are rejected', () => {
  assert.deepEqual(readIdealFor(['families', 'Kids', 'pets', 'couples', 'Friends', 'invalid', 'pets']), ['Families', 'Kids', 'Pets', 'Couples', 'Friends']);
});

test('the full editor draft includes categories and detects edits under hotel information', () => {
  let state = initEditorState({ tab: 'info' });
  state = editorReducer(state, { type: 'toggleIdealFor', category: 'Pets', checked: true });
  state = editorReducer(state, { type: 'toggleIdealFor', category: 'Couples', checked: true });
  assert.deepEqual(state.draft.idealFor, ['Pets', 'Couples']);
  assert.deepEqual(changedTabs(state), ['info']);
  const parsed = readListingDraft(state.draft);
  assert.deepEqual(parsed.idealFor, ['Pets', 'Couples']);
  state = editorReducer(state, { type: 'toggleIdealFor', category: 'Pets', checked: false });
  assert.deepEqual(state.draft.idealFor, ['Couples']);
});

test('traveler tags persist as public-search tags without overwriting unrelated amenities', () => {
  const oldTags = ['Pool', 'EV Charging', 'Families', 'Pets'];
  const amenityTags = mergeAmenityTags(oldTags, ['pool', 'family_rooms']);
  const tags = mergeIdealForTags(amenityTags, ['Couples', 'Friends']);
  assert.deepEqual(idealForFromTags(tags), ['Couples', 'Friends']);
  assert.ok(tags.includes('Family rooms'));
  assert.ok(tags.includes('Pool'));
  assert.ok(tags.includes('EV Charging'));
  assert.deepEqual(amenitiesFromTags(tags), ['pool', 'family_rooms']);
});

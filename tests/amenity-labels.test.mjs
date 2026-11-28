import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayAmenityLabel, roomAmenities, tags } from '../app/search/types.ts';

test('accessibility amenity is labeled Accessible without changing stored filter tags', () => {
  assert.equal(displayAmenityLabel('ADA Compliant'), 'Accessible');
  assert.equal(displayAmenityLabel('Kitchen'), 'Kitchen');
  assert.ok(roomAmenities.includes('ADA Compliant'));
  assert.ok(tags.includes('ADA Compliant'));
  assert.ok(!tags.includes('Accessible'));
});

// The AI route must build its instructions per request, so "today" can't go stale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('AI instructions are not a module-level constant', async () => {
    const source = await readFile(new URL('../app/api/search/ai/route.ts', import.meta.url), 'utf8');
    assert.match(source, /instructions:\s*getInstructions\(todayInTimeZone\(tz\)\)/);
    assert.doesNotMatch(source, /^const instructions\s*=/m);
});

test('AI "today" comes from the guest time zone, not UTC', async () => {
    const source = await readFile(new URL('../app/api/search/ai/route.ts', import.meta.url), 'utf8');
    assert.match(source, /const \{ messages, tz \} = \(body \?\? \{\}\)/);
    assert.doesNotMatch(source, /todayUTC|in UTC/);
});

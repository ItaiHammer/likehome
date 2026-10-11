// todayInTimeZone: "today" in the guest's own calendar, not UTC's.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { todayInTimeZone, validateReservationInput } = await import('../utils/reservation-logic.ts');

// 6pm Pacific on Oct 10 is already Oct 11 in UTC
const pacificEvening = new Date('2026-10-11T01:00:00Z');

test('uses the given time zone', () => {
    assert.equal(todayInTimeZone('America/Los_Angeles', pacificEvening), '2026-10-10');
    assert.equal(todayInTimeZone('America/Vancouver', pacificEvening), '2026-10-10');
    assert.equal(todayInTimeZone('Asia/Tokyo', pacificEvening), '2026-10-11');
});

test('falls back to UTC when the zone is missing or invalid', () => {
    for (const tz of [undefined, null, '', '   ', 'Not/AZone', 42]) {
        assert.equal(todayInTimeZone(tz, pacificEvening), '2026-10-11', String(tz));
    }
});

test('a Pacific guest can book a same-day check-in at 6pm', () => {
    const body = { room_id: 'room-1', check_in: '2026-10-10', check_out: '2026-10-12' };
    assert.equal(validateReservationInput(body, todayInTimeZone('America/Los_Angeles', pacificEvening)).ok, true);
    // Judged in UTC (the old behavior) the same request is rejected
    assert.equal(validateReservationInput(body, todayInTimeZone(undefined, pacificEvening)).ok, false);
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a uuid in any letter case, like the ids of hotels, rooms and reservations. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

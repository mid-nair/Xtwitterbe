/** A MongoDB ObjectId is exactly 24 hex characters. */
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_RE.test(value);
}

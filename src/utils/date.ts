import dayjs from 'dayjs'

/**
 * Returns the current time as a dayjs object.
 */
export function now(): dayjs.Dayjs {
  return dayjs()
}

/**
 * Returns an ISO 8601 string. Defaults to the current time.
 * Use instead of `new Date().toISOString()`.
 */
export function toISO(d: dayjs.Dayjs = now()): string {
  return d.toISOString()
}

/**
 * Parses an ISO 8601 string and returns a locale-aware display string.
 * Use instead of `new Date(str).toLocaleString()`.
 */
export function toLocaleString(isoString: string): string {
  return dayjs(isoString).toDate().toLocaleString()
}

/**
 * Parses an ISO 8601 string and returns its Unix timestamp in milliseconds.
 * Use instead of `new Date(str).getTime()`.
 */
export function toTimestamp(isoString: string): number {
  return dayjs(isoString).valueOf()
}

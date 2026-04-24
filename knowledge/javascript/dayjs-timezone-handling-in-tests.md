# dayjs Timezone Handling in Tests

**Type:** Discovery

## Context

When testing date utilities that use dayjs, creating dayjs objects by manually setting date components (`.year()`, `.month()`, etc.) on a time-dependent base object can produce unexpected UTC values due to local timezone offset. This matters when writing precise edge-case tests for functions like `toISO()`, `toLocaleString()`, and `toTimestamp()`.

## What is true

- `dayjs(isoString)` correctly parses ISO strings regardless of the system timezone
- Manually building dates from components (e.g., `now().year(1970).month(0).date(1)...`) inherits the local timezone offset, causing UTC conversion mismatches
- `dayjs.utc()` is not available by default — it requires an explicit UTC plugin import
- For testing simple dayjs wrapper utilities, using real ISO strings avoids timezone complications while still validating observable behavior

## Do

- Parse ISO strings directly: `const epoch = dayjs('1970-01-01T00:00:00.000Z')`
- Use `vi.useFakeTimers()` for tests that depend on the current time
- Test with real ISO strings when validating date parsing behavior

## Don't

- Manually set date components on `now()` when testing specific historical or far-future dates
- Assume `dayjs.utc()` is available without importing the UTC plugin
- Test the timezone behavior of dayjs itself — test your wrapper function's observable behavior

---

**Keywords:** dayjs, timezone, ISO 8601, date testing, local time, UTC, edge cases

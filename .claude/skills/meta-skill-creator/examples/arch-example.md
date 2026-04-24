---
name: arch-api-design
description: REST API design conventions. Use when adding or reviewing API endpoints, route handlers, or HTTP response shapes.
paths:
  - 'src/api/**'
  - 'src/routes/**'
disable-model-invocation: false
---

When adding or reviewing an API endpoint:

1. **Route naming**: Use kebab-case nouns, never verbs — `/session-events` not `/getSessionEvents`
2. **Response shape**: Always wrap in `{ data: ..., error: null }` or `{ data: null, error: { code, message } }`
3. **Status codes**: 200 success, 201 creation, 400 validation, 404 not found, 500 unexpected
4. **Validation**: Validate at the route layer; never trust raw input downstream

## Error handling

- Return structured errors — never bare strings
- Log the full error server-side; expose only `code` and `message` to the client
- Use the shared `createError(code, message)` helper from `src/lib/errors.ts`

## Notes

- Never add business logic inside route handlers — delegate to the service layer
- Read `src/lib/api/` middleware before adding new middleware

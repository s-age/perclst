# "Collect Lines Then Parse" Is an Anti-Pattern for Streaming

**Type:** Discovery

## Context

During refactoring of `agentRepository.ts`, the `arch-repositories` skill was found to document
"collect lines then parse" as a **Good** pattern for stream handling. This documentation is
outdated and directly caused the buffer memory-leak described in
`knowledge/agent/dispatch-stream-buffer-memory-leak.md`.

## What happened / What is true

- The skill entry marked accumulating all JSONL lines into `string[]` before parsing as
  the recommended approach.
- The actual consequence is unbounded memory growth proportional to stream output size.
- The correct pattern — incremental processing with `processLine(state, line)` — was
  introduced as a fix, but the skill documentation was not updated at the same time.
- The architectural principle ("repositories own parse responsibility") is still valid;
  only the implementation pattern changed from batch to incremental.

## Do

- Use incremental parse state (`createParseState` / `processLine` / `finalizeParseState`)
  for any long-running JSONL stream.
- Update skill/procedure documentation whenever a pattern it endorses is found to be wrong.
- Treat outdated skill docs as a bug — future agents will repeat the mistake otherwise.

## Don't

- Don't rely on `arch-repositories` skill's "collect lines then parse" guidance; it is stale.
- Don't assume the architecture principle and the implementation pattern are both correct
  just because the principle is sound.

---

**Keywords:** arch-repositories, skill documentation, stale, collect lines, incremental parse, streaming, pattern, anti-pattern, agentRepository, memory

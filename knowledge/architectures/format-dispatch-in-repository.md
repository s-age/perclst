# Format Dispatch Belongs in the Repository Layer

**Type:** Discovery

## Context

When adding support for multiple file formats (e.g. JSON and YAML) to pipeline files,
the question arises: which layer should decide how to read and write each format?

## What happened / What is true

Format dispatch logic — branching on file extension to select a parser/serializer — belongs
in the repository layer, not the domain or infrastructure layer directly.

- `repositories/fileMoveRepository.ts` implements `readRaw` / `write` with format branching.
- Infrastructure owns the "how to read a file" mechanics; domain accesses it only through port abstractions.
- The question "is this YAML?" is knowledge about file formats, making the repository layer
  (the bridge between infrastructure and domain) the appropriate home.
- The domain layer should never need to know which format is in use.

## Do

- Put format dispatch (JSON vs YAML branching) inside the repository implementation.
- Keep domain code format-agnostic; access files only through port interfaces.

## Don't

- Don't put format selection logic inside domain services or use-cases.
- Don't expose format-specific methods directly on port interfaces if a single
  abstraction can handle all formats.

---

**Keywords:** format dispatch, YAML, JSON, repository layer, infrastructure, domain, file format, port, pipeline

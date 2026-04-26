# Repository Pick<FsInfra> Narrow Typing Pattern

**Type:** Discovery

## Context

When refactoring repositories to use constructor injection, each repository should declare a local narrow type from the infra interface rather than accepting the full God Object.

## Discovery

`FsInfra` is a God Object with many methods. If a repository accepts the full `FsInfra` in its constructor, it silently gains access to every method on the interface — even ones it should never call. Narrowing to a `Pick` makes the actual dependency surface explicit.

Pattern:

```typescript
// Inside the repository file
type SessionFs = Pick<FsInfra, 'readFile' | 'writeFile' | 'mkdir'>;

export class SessionRepository {
  constructor(private readonly fs: SessionFs) {}
}
```

Test files should cast to the same Pick type — not to the full `FsInfra`:

```typescript
const mockFs = { readFile: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn() } as unknown as SessionFs;
```

## Do

- Declare `type XxxFs = Pick<FsInfra, 'method1' | 'method2'>` at the top of each repository file
- Use that local type as the constructor parameter type
- Cast test mocks to the local `Pick` type, not to `FsInfra`

## Don't

- Accept the full `FsInfra` interface in a repository constructor
- Cast test mocks to `FsInfra` when a narrower `Pick` type exists
- Add methods to the `Pick` that the repository doesn't actually call

---

**Keywords:** DI, dependency injection, FsInfra, Pick, repository, constructor injection, narrow type, God Object

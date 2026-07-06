# Contributing to grahan

Thanks for your interest! Ground rules, so your time is well spent:

## Setup

```bash
pnpm install        # Node >= 22.13 for the toolchain (pnpm 11)
pnpm test           # vitest, run from the repo root
pnpm lint && pnpm format:check && pnpm typecheck
```

## The one non-negotiable: fixtures first

Every calculation is verified against Swiss Ephemeris reference fixtures
committed under `packages/*/fixtures/` (generated offline by the Python
scripts in `scripts/` — Swiss Ephemeris is AGPL and never touches the
MIT runtime). A new formula without a fixture set will not be merged:

1. Add or extend a generator in `scripts/` (they self-check golden
   values and abort before writing anything on a mismatch).
2. Commit the fixtures, then write the implementation against them.
3. Print measured accuracy in the test (`[accuracy] …` lines) and
   assert a budget just above the measured worst case.

## Conventions

- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `ci:`).
- TypeScript strict, no `any`, no non-null assertions, zero runtime
  dependencies, files around 200 lines with one concern each.
- Public functions carry JSDoc with a runnable example, and their
  runtime exports are frozen by `tests/api-surface.test.ts` — adding an
  export means consciously editing that list.
- Boring, readable code beats clever code.

## License

MIT. By contributing you agree your contribution is licensed the same.

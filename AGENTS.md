# Agent brief — `@jterrazz/broadcast`

Define an announcement once, send it to every channel that implements the port — App Store In-App Events today, more planned. This file **routes**; it does not restate what the corpus already says.

## Where knowledge lives (route here first)

The corpus is `docs/` + `README.md`, mapped by `docs/README.md`. Decisions this package alone took are in `docs/decisions/`. Do not duplicate it — link to it.

| Working on…                                    | Read                      |
| ---------------------------------------------- | ------------------------- |
| the ports/core/adapters layers, the barrel     | `docs/01-architecture.md` |
| the toolchain, commands, where a change opens  | `docs/02-developing.md`   |
| the unit and integration suites                | `docs/03-testing.md`      |
| the release, and what a merge does not do      | `docs/04-operating.md`    |
| the provider port, Apple, the planned channels | `docs/05-channels.md`     |

The first four chapters are the spine every repository of the estate carries — architecture, developing, testing, operating — and this repository's own gate refuses a tree that breaks it (`@jterrazz/typescript`'s Docs (layout) pass). The doctrine behind the spine belongs to `jterrazz-studio`, not to this repository.

One Claude Code skill routes into this corpus: `skills/jterrazz-broadcast/` (the model, the Apple provider, adding a channel). It does not restate the corpus — it routes into it.

`CLAUDE.md` at the root is a symlink to this file: one brief, two names, no second copy.

## Setup

```bash
npm install
```

## Commands

| Task                                    | Command            |
| --------------------------------------- | ------------------ |
| Run all tests                           | `npm test`         |
| Lint + format + typecheck + unused-code | `npm run lint`     |
| Auto-fix lint issues                    | `npm run lint:fix` |
| Build ESM + CJS + types                 | `npm run build`    |

## Standing rule

A new channel is a new directory under `src/adapters/`, exported from `src/index.ts`, documented in `docs/05-channels.md` and proved by its own `*.adapter.test.ts` — see `docs/02-developing.md` for the full convention. A change to the public API updates `README.md` and the chapter it falsifies in the same commit.

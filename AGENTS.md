# Agent brief — `@jterrazz/broadcast`

Define an announcement once, send it to every channel that implements the port — App Store In-App Events today. This file **routes**; it does not restate what the corpus already says.

## Where knowledge lives (route here first)

The corpus is `docs/` + `README.md`, mapped by `docs/README.md`. Decisions this package alone took are in `docs/decisions/`. Do not duplicate it — link to it.

| Working on…                                              | Read                                |
| -------------------------------------------------------- | ----------------------------------- |
| the ports/core/adapters layers, the fan-out, the barrel  | `docs/concepts/architecture.md`     |
| the declaration, the gestures, where a new file goes     | `docs/guides/develop.md`            |
| the specs, the declared App Store Connect, the mutations | `docs/guides/test.md`               |
| a new channel, in a consumer or in this package          | `docs/guides/write-a-channel.md`    |
| the release, and who is allowed to cut one               | `docs/guides/release.md`            |
| the Apple channel: credentials, calls, mapping, limits   | `docs/reference/apple-app-store.md` |

The manual is cut by its reader's need — `guides/`, `concepts/`, `reference/` — the shape every repository of the ecosystem keeps, and `typescript check` refuses a tree that breaks it (the Docs (layout) pass).

One Claude Code skill routes into this corpus: `skills/jterrazz-broadcast/`. It does not restate the corpus — it routes into it.

## Setup and commands

The gestures — `make install` (`npm ci`, never a plain `npm install`, which can rewrite the lockfile), `make build`, `make lint`, `make fix`, `make test`, `make mutation`, `make check` — and what each runs are [Develop § The gestures](docs/guides/develop.md#the-gestures)'s.

## Standing rule

A new or changed export reaches `README.md`, the relevant `docs/` page and the `skills/jterrazz-broadcast/` skill in the same change — none of the three is generated, so nothing else catches a stale one ([Develop § What a change owes](docs/guides/develop.md#what-a-change-owes)).

`CLAUDE.md` at the root is a symlink to this file: one brief, two names, no second copy.

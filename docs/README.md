# @jterrazz/broadcast — documentation

A multi-channel broadcast system: define an announcement once, send it to every provider that implements the port. This corpus is where that knowledge is authored — `AGENTS.md` and the `jterrazz-broadcast` skill route into it; they never restate it.

## Table of contents

The first four chapters are the spine every repository of the estate carries; the rest are this package's own subjects, numbered after it.

| Chapter                                 | Covers                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| [01 — Architecture](01-architecture.md) | The three layers — ports, core, adapters — and how a broadcast fans out         |
| [02 — Developing](02-developing.md)     | The toolchain, the commands, where a new provider's code goes                   |
| [03 — Testing](03-testing.md)           | The unit and integration suites, what each proves and what neither does         |
| [04 — Operating](04-operating.md)       | What publishes this package, and what a merge to `main` does not do             |
| [05 — Channels](05-channels.md)         | The provider port, the Apple App Store channel today, the channels planned next |

## Decisions

The records of decisions this package alone took are in [`decisions/`](decisions/), numbered in the order they were taken. A decision spanning several repositories is recorded by the corpus that spans them.

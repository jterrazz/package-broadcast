# @jterrazz/broadcast — the manual

A multi-channel broadcast system: define an announcement once, send it to every provider that implements the port. What the package is and how a consumer starts using it is the repository's README; this page lists every page of the manual, by what the reader came to do.

## Guides

| Page                                         | Answers                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [Develop](guides/develop.md)                 | Changing the package: the declaration, the gestures, where a new file goes, what it owes       |
| [Test](guides/test.md)                       | Proving a change: the specs, the declared App Store Connect, the tarball, the mutation verdict |
| [Write a channel](guides/write-a-channel.md) | Adding a channel — in a consumer's code, or shipped by this package                            |
| [Release](guides/release.md)                 | How the package is published, and who cuts a release                                           |

## Concepts

| Page                                     | Answers                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| [Architecture](concepts/architecture.md) | The three layers — ports, core, adapters — and how a broadcast fans out |

## Reference

| Page                                            | Answers                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [Apple App Store](reference/apple-app-store.md) | The Apple channel: its credentials, what each call sends, the field mapping, Apple's limits |

## Decisions

The records of decisions this package alone took are in [`decisions/`](decisions/), numbered in the order they were taken, the mold `_template.md` beside them. A decision spanning several repositories is recorded by the corpus that spans them.

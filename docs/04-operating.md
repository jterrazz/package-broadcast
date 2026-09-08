# Operating

This repository ships one thing: the npm package `@jterrazz/broadcast`, published to the public registry (`publishConfig.registry` in `package.json`). There is no service, no image and no infrastructure this repository runs — what "operating" means here is the release, and who is allowed to cut one.

## What a merge to `main` does

Nothing that reaches a consumer. `.github/workflows/validate.yaml` fires on every push and pull request to `main` and calls the shared `jterrazz-actions` validation workflow (install, lint, test, on Node 24). A green `main` is a publishable tree, not a published one — a docs-only commit, like this one, redeploys and republishes nothing.

## What publishes

`.github/workflows/release.yaml` fires on `release: created` and calls the shared `jterrazz-actions` `release-npm.yaml` workflow, with npm provenance (`permissions: id-token: write`). So exactly one gesture publishes, and a human makes it: cutting a GitHub Release.

The sequence, in order:

1. the change merges to `main` and validates green;
2. the owner bumps `version` in `package.json` (and the lockfile);
3. the owner tags `vX.Y.Z` and creates the GitHub Release;
4. the workflow builds and publishes the package to npm.

A contributor never bumps the version inside a feature branch — the tag is what the registry answers to, and two branches in flight claiming the same number is a conflict this sequence avoids by leaving the bump to the release step.

## How a consumer takes it

A consumer installs `@jterrazz/broadcast` as a runtime dependency and imports from the single barrel, `src/index.ts` (see [Architecture](01-architecture.md)). Nothing here is wired into another repository's toolchain the way `@jterrazz/typescript` or `@jterrazz/test` are — a bump is an ordinary dependency update, taken when the consumer chooses to.

## Related

- [Testing](03-testing.md) — what `validate.yaml` runs before a release is even possible.
- [Channels](05-channels.md) — what a new release can add without a breaking change: a channel, not a port change.

# Release

This repository ships one thing: the npm package `@jterrazz/broadcast`, published to the public registry (`publishConfig.registry` in `package.json`). There is no service, no image and no infrastructure of its own: releasing it is the whole of shipping it, and this guide is how it is cut and who cuts it.

## What a merge to `main` does

Nothing that reaches a consumer. `.github/workflows/validate.yaml` runs on every push and pull request to `main` and calls the shared `jterrazz-actions` validation workflow (build, lint, test, mutation). A green `main` is a publishable tree, not a published one.

## What publishes

`.github/workflows/release.yaml` fires on `release: created` and calls the shared `release-npm.yaml` workflow with npm provenance (`id-token: write`). Exactly one gesture publishes, and a human makes it: cutting a GitHub Release.

1. the change merges to `main` and validates green;
2. the owner bumps `version` in `package.json` (and the lockfile) on `main`;
3. `make rehearse` runs the gate on that commit as the runner will, on Linux ([A rehearsal on Linux](https://github.com/jterrazz/package-typescript/blob/main/docs/reference/commands.md#a-rehearsal-on-linux)), and exits 0;
4. the owner tags `vX.Y.Z` and creates the GitHub Release;
5. the workflow builds and publishes the package to npm.

A contributor never bumps the version inside a feature branch: two branches in flight would both claim the same number.

## How a consumer takes it

A consumer installs `@jterrazz/broadcast` as a runtime dependency and imports from its one entry. A bump is an ordinary dependency update, taken when the consumer chooses to; a new channel is a minor, a change to the port a major.

## Related

- [Test](test.md): what the validation runs before a release is possible.

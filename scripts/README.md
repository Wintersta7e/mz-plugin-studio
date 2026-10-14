# Scripts

- `scripts/check-coverage.mjs` — run by `npm run test:coverage` and `npm run test:golden:coverage`; checks that coverage reports every tracked source file and that each directory, or each golden-covered generator file, is at or above its floor
- `scripts/check-golden-commits.mjs` — run with a commit range, or `--github-event` in CI; checks that commits changing `src/` add no golden file or case, test-only commits delete no golden line, and user-visible golden changes carry a `CHANGELOG.md` change
- `scripts/ci-policy.mjs` — run before packaging a release: `package <app.asar>` checks the packaged app's top-level entries, licence files and `node_modules/` size; `runtime-deps` checks that `dependencies` lists exactly the packages the main process and preload import.

# Scripts

No CI workflow runs these scripts yet: run them by hand, directly or through the npm scripts named below.

- `scripts/check-coverage.mjs` — run by `npm run test:coverage` and `npm run test:golden:coverage`; checks that coverage reports every tracked source file and that each directory, or each golden-covered generator file, is at or above its floor
- `scripts/check-golden-commits.mjs` — `node scripts/check-golden-commits.mjs <base>..<head>`, or `--github-event` to take the range from a GitHub Actions event; checks that commits changing `src/` add no golden file or case, test-only commits delete no golden line, and user-visible golden changes carry a `CHANGELOG.md` change
- `scripts/ci-policy.mjs` — run before packaging a release: `package <app.asar>` checks the packaged app's top-level entries, licence files and `node_modules/` size; `runtime-deps` checks that `dependencies` lists exactly the packages the main process and preload import.
- `scripts/third-party-licenses.mjs` — `npm run licenses` after any lockfile change rewrites `THIRD_PARTY_LICENSES.md`; `npm run licenses -- --check` fails when it is stale.

# Coding Guidelines

## Production URL

- https://climato.smoxu.com

## Playwright

- Always clean up playwright files after use

## Testing

Do not test the UI when employing TDD, focus on business logic. You should not add UI-only tests that merely assert rendered text, layout, CSS classes, component structure, or visual composition. You should look for the underlying business logic boundary first and test there instead.

## Documentation hygiene

- After shipping a meaningful change, audit any related docs (e.g. `docs/monetisation.md`) and re-mark the status of items the change touched (✅ done · 🟡 partial · ⬜ not started). Bump the `Last audit:` date at the top of the doc.
- "Meaningful" means: a feature or system the doc tracks now behaves differently. Bug fixes, refactors, and infra-only changes don't usually qualify.
- Verify each status claim against the codebase, not memory. If a doc claims something is done, grep / read the file before leaving the marker as ✅.

## Local dev environment

- `pnpm dev` auto-loads `.env.local` via Vite's `loadEnv` — set secrets there (e.g. `ADMIN_PASSWORD=...`) rather than prefixing the command. Do not commit `.env.local`.

## API endpoint rules

- All `/api/*` endpoints that accept city data must validate through `validateCity()` in `api/_lib/catalog.ts`. Only numeric GeoNames ids present in `data/cities.tsv` and the 17 curated ids are accepted.
- Client hooks that call these endpoints must be gated on `isResolvedCity()` from `src/lib/slug.ts`. The URL handler produces synthetic placeholder ids (e.g. `spain-madrid`) for first-paint that the API rejects — hooks must stay disabled until geocoding upgrades the city to a real id.

## data/normals hygiene

- `data/cities.tsv` can contain GeoNames country-level entries (feature class `PCLI`) because `build-cities.sh` only filters on population, not feature class. These slip into `data/normals/` as meaningless centroid data. If a new numeric id has no city name after backfill, check the GeoNames feature class before assuming it's a real city.
- `_index.json` is the human-readable companion to the opaque numeric filenames. Every entry should have `name` + `country`. Run the backfill script against `data/cities.tsv` if new entries appear without names.

## Other

- Update this file with essential guidelines

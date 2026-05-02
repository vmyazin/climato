# Coding Guidelines

## Production URL

- https://climato.smoxu.com

## Playwright

- Always clean up playwright files after use

## Documentation hygiene

- After shipping a meaningful change, audit any related docs (e.g. `docs/monetisation.md`) and re-mark the status of items the change touched (✅ done · 🟡 partial · ⬜ not started). Bump the `Last audit:` date at the top of the doc.
- "Meaningful" means: a feature or system the doc tracks now behaves differently. Bug fixes, refactors, and infra-only changes don't usually qualify.
- Verify each status claim against the codebase, not memory. If a doc claims something is done, grep / read the file before leaving the marker as ✅.

## Other

- Update this file with essential guidelines

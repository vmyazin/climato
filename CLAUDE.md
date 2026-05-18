Refer to AGENTS.md for coding guidelines.

## Auto-load skills

- **Sketch findings for climato** (design decisions, CSS patterns, visual direction for comparison pages and shared components) → `Skill("sketch-findings-climato")`

## Playwright MCP cleanup

When QA-ing with Playwright MCP (browser snapshots, screenshots, console logs),
the tool drops artifacts into the repo root (`compare-*.png`, mobile/desktop
PNGs) and into `.playwright-mcp/` (YAML snapshots, console logs).

Before committing, delete any Playwright artifacts created during the session:

```bash
rm -rf .playwright-mcp compare-*.png *-mobile-*.png *-desktop-*.png
```

These paths are already in `.gitignore`, so an accidental `git add` won't pick
them up — but they still clutter `git status` and the working tree. Always
clean up before handing the branch off.

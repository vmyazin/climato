# Code Review — `feat/weather-provider-fallback`

**Reviewer:** Claude (final review before merge to main)
**Branch:** `feat/weather-provider-fallback` (13 commits ahead of main)
**Spec:** `docs/superpowers/specs/2026-05-23-weather-provider-fallback-design.md`
**Plan:** `docs/superpowers/plans/2026-05-23-weather-provider-fallback.md`
**Tests:** 22 pass, all green on `pnpm test:run`.

## TL;DR

Overall well-executed. The orchestrator design is sound; the AbortController/timeout interaction is correct and leak-free; the fallback chain composes cleanly; the test surface covers the right risky paths. Security parity between `/api/current` and `/api/normals` is good — same `validateCity`, same `checkRateLimit`, same input validation.

There are **two correctness gaps worth fixing before merge**:

1. Empty-but-200 responses from either archive provider get silently aggregated to all-zero `Normals` and cached in KV for 30 days.
2. The polar-fallback `'06:00' / '18:00'` in `sun.ts` will produce visibly wrong data for in-catalog cities (Murmansk, Norilsk) in June/July/December — currently silently returns an arbitrary equator default that looks like real data on the page.

The rest is polish.

---

## Critical

### C1. Empty-but-200 archive response is cached as all-zero `Normals`

**Where:**
- `api/_lib/weather/providers/open-meteo-archive.ts:20-27`
- `api/_lib/weather/providers/nasa-power-archive.ts:50-54`
- `api/_lib/normals.ts:23-65` (`aggregate`)
- `api/normals.ts:135-149`

**Why it matters:** Both providers validate that the response has the expected *fields*, but not that those fields are *non-empty*. Open-Meteo's check is `Array.isArray(d.time)` — an empty array passes. NASA POWER's check is `if (!p?.T2M_MAX || !p.T2M_MIN)` — an empty object `{}` passes (`!{}` is `false`).

If upstream returns 200 with an empty `daily` block (a known failure mode during partial outages — the API responds but with no data for the requested window), `aggregate()` iterates zero days and returns:

```
{ high: [0,0,...0], low: [0,0,...0], precip: [0,...], sun: [0,...] }
```

`/api/normals` then:
- Returns this to the user as a successful 200,
- Writes it to KV with a 30-day TTL,
- Will be drained into `data/normals/<id>.json` and committed to the repo on the next hourly drain.

There is no path that detects "we got nothing back from upstream" because the orchestrator never sees it — it considers any provider that didn't throw to be a success.

**Fix:** In each archive provider, after the field-shape check, also assert non-empty:

```ts
// open-meteo-archive.ts
if (d.time.length === 0 || d.temperature_2m_max.length === 0) {
  throw new Error('open-meteo archive: empty daily fields')
}

// nasa-power-archive.ts (in normalizeNasaPower, before the for-loop)
const keys = Object.keys(p.T2M_MAX).sort()
if (keys.length === 0) {
  throw new Error('nasa-power: empty T2M_MAX')
}
```

A throw here puts the orchestrator into fallback mode, exactly as intended for "upstream returned junk."

A second layer of defense in `aggregate()` (refuse to produce a result when no months have any data) would also be reasonable, but the provider-level check is cleaner — it surfaces the wrong upstream to logs with the provider name.

---

## Important

### I1. Polar polar-day/polar-night fallback returns misleading civil times

**Where:** `api/_lib/weather/sun.ts:81-82`

```ts
sunrise.push(sr ? formatLocal(sr, tz) : '06:00')
sunset.push(ss ? formatLocal(ss, tz) : '18:00')
```

**Why it matters:** When `solarEvent` returns null (polar day or polar night), the code emits `'06:00' / '18:00'` as a fallback. Two in-catalog cities are affected: **Murmansk (68.97°N)** and **Norilsk (69.35°N)**. Verified output for Murmansk:

```
month 5 sunrise 02:11 sunset 23:16
month 6 sunrise 06:00 sunset 18:00   ← polar day, 24h sun
month 7 sunrise 06:00 sunset 18:00   ← polar day
month 8 sunrise 03:55 sunset 21:48
...
month 12 sunrise 06:00 sunset 18:00  ← polar night, no sunrise
```

The user-visible result is "Murmansk: June sunrise 06:00, sunset 18:00" on the city page, indistinguishable from an equatorial city. This is worse than no data — it's confidently wrong.

**Fix options (pick one, in order of preference):**

1. **Return polar sentinels and handle in UI.** Change the contract: `sunrise[i]: string | null`. Polar day → e.g. `'00:00'` and `'24:00'`, or a dedicated sentinel. Polar night → `null`. UI renders "24h light" / "no sunrise". This is the only honest answer.

2. **Use astronomical/civil twilight as a fallback.** When the sun never reaches –0.833°, fall back to civil twilight (–6°), then nautical (–12°), then astronomical (–18°). Buys 2–3° of latitude before fallback kicks in, but doesn't fix the truly polar months — Norilsk in late December has no civil twilight either.

3. **Document and accept** by removing Murmansk/Norilsk from the catalog (or marking them polar in the UI). Worst of the three but trivial.

If left as-is, this should at minimum be documented as a known visible bug in a follow-up issue, not buried in a `'06:00'` literal. The comment on line 71 (`Falls back to '06:00' / '18:00' on polar days.`) is technically correct but understates the impact.

### I2. MET Norway User-Agent points to wrong domain

**Where:** `api/_lib/weather/providers/met-no-forecast.ts:6`

```ts
const USER_AGENT = 'climato/1.0 (+https://climato.app/contact)'
```

**Why it matters:** MET Norway's terms of service require that the User-Agent identify the application and provide a way to reach the operator. The canonical domain is `climato.smoxu.com` (see `AGENTS.md`, `vite.config.ts:111`, `docs/monetisation.md`). There is no `climato.app/contact` page — if MET Norway tries to contact us about anomalous traffic, they hit a dead URL. This is a soft ToS violation and removes our ability to be notified before getting blocked.

The plan document carried the same wrong URL through; this is a plan-time error that propagated cleanly into the implementation.

**Fix:** Change to a working contact path, e.g. `climato/1.0 (+https://climato.smoxu.com)` or include the contact email (`rapidlyproductive@gmail.com`) directly: `climato/1.0 admin@climato.smoxu.com` per MET Norway's recommendation in their ToS. The latter is what they actually prefer for low-volume non-commercial use.

### I3. `controller.abort(new Error('timeout'))` is fine in Node 20+ but worth a defensive guard

**Where:** `api/_lib/weather/try-providers.ts:21`

**Why it matters:** Passing an Error to `controller.abort(reason)` propagates through `fetch` correctly in Node 20+ — verified locally: the fetch rejects with `Error: timeout`. So the `tryProviders` catch block records the message as the reason and falls through. ✓

However, the test at `try-providers.test.ts:32-41` mocks the slow provider with its own `addEventListener('abort', () => reject(new Error('aborted')))`. The test does NOT exercise the path where the abort `reason` is read from `signal.reason`. So if someone later refactors `tryProviders` to inspect `signal.reason` (e.g. to distinguish timeout from other aborts), the test won't catch the breakage. Polish, but consider adding one test that asserts the **distinguishability** of the timeout case in errors, or that the error message on a real timeout contains `'timeout'`.

Also: Node 18 had a regression where fetch wrapped an `Error` abort-reason in a TypeError. Since Vercel's serverless runtime targets Node 20 as of 2025-Q4, this is fine in production, but pin the Node engine in `package.json` (`"engines": { "node": ">=20" }`) to make the assumption explicit. Currently there's no `engines` field.

### I4. `Intl.DateTimeFormat('en-GB', { hour12: false })` has a known midnight quirk on some ICU versions

**Where:** `api/_lib/weather/sun.ts:57-62`

**Why it matters:** Historically (pre-Node 18 / pre-ICU 70), `en-GB` with `hour12: false` rendered midnight as `'24:00'` rather than `'00:00'`. This is fixed in current Node versions (verified `'00:00'` on Node 25), but Vercel's runtime can move and an `en-GB` rule change in CLDR data could cause a regression that wouldn't show up in CI until a sunset happens to fall exactly at local midnight.

**Fix:** Specify `hourCycle: 'h23'` explicitly. This guarantees `00:00` regardless of locale or ICU version:

```ts
return new Intl.DateTimeFormat('en-GB', {
  timeZone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
}).format(date)
```

Note: when `hourCycle` is set, you must omit `hour12` (they conflict). Defensive, costs nothing.

### I5. `aggregate()` swallows the all-null-month case to `0`

**Where:** `api/_lib/normals.ts:51`

```ts
const r1 = (s: number, c: number) => Math.round((s / (c || 1)) * 10) / 10
```

**Why it matters:** If a given month has zero non-null daily values (`hiCnt[m] === 0`), this returns `Math.round((0/1)*10)/10 === 0`. Combined with C1 above, an empty upstream response produces a perfectly plausible-looking "Tokyo, January high: 0°C, low: 0°C" output. Same risk applies if the upstream returns data with all nulls in a specific month — the page would silently show 0s for that month.

Plausibly out of scope (the existing main-branch code has the same pattern), but worth a comment so the next person doesn't take this as well-tested behavior. C1's provider-level non-empty assertion handles the wholesale empty case. Per-month gaps would still slip through; whether that's a real risk depends on NASA POWER's coverage stability. Low-priority follow-up.

### I6. No protection against MET Norway returning a timeseries that starts in the past

**Where:** `api/_lib/weather/providers/met-no-forecast.ts:17-25` (`normalizeMetNo`)

**Why it matters:** `normalizeMetNo` takes `timeseries[0]` unconditionally. MET Norway's contract is "first entry is the nearest upcoming hour," but during outages or cache-staleness, the first entry can be a few hours stale. The hook treats this as "current temperature now" via React Query (`staleTime: 5 min`), but if MET Norway returns a 6-hour-old timestamp, the UI will display an old value as live.

Open-Meteo's `current.time` is "now" by construction. So switching to MET Norway can subtly change the semantic of `observedAt` from "now-ish" to "next forecast hour." This isn't surfaced to users in any component (verified: no UI references to `current.observedAt`), but it's a latent issue if anyone adds a "as of X" timestamp display.

**Fix (optional):** Either:
- Validate `observedAt` is within ±2h of `Date.now()` and throw otherwise (falls through to next provider; downside: when Open-Meteo is the *only* failure and MET Norway has slightly stale data, the user gets a 502 instead of a slightly-stale temp).
- Document the semantic difference in the `CurrentTemp` interface JSDoc.

I'd lean toward documenting, not validating — staleness here is mild and not user-visible.

---

## Polish

- **P1.** `api/_lib/weather/sun.ts:1` uses `@ts-ignore` but the project has `@types/tz-lookup` in `devDependencies` (`package.json:39`). The `@ts-ignore` and the abandoned `tz-lookup.d.ts` declaration plan (mentioned in Task 1 Step 4 of the plan) are no longer needed. Replace with a clean `import tzlookup from 'tz-lookup'`. If types still don't resolve, the issue is in `tsconfig` paths, not the import.

- **P2.** `try-providers.test.ts:32` uses `_signal: AbortSignal` (underscore prefix conventionally means "intentionally unused") and then uses it on the next line. Drop the underscore: `signal: AbortSignal`.

- **P3.** `try-providers.ts:27` `console.error` fires during tests. Tests pass cleanly but `pnpm test:run` output spams `[weather] provider "p1" failed: boom` etc. for the negative-path tests. Consider either:
  - Silencing with `vi.spyOn(console, 'error').mockImplementation(() => {})` in the affected tests (cleanest), or
  - Routing through a small `log()` helper that's no-op in test env.

- **P4.** `nasa-power-archive.ts:54` comment `// sortable: YYYYMMDD lexicographic = chronological` is technically true but worth one extra sentence: "...because NASA POWER returns un-ordered keys in some edge cases (verified in fixture testing)." Or remove the comment and trust the reader. Current state reads as defensive code without telling you why.

- **P5.** `nasa-power-archive.ts:32-38` `dayOfYear` recomputes `Date.UTC(y, 0, 1)` for every key. With ~3650 days in the archive window, this is 3650 redundant Date constructions per request. Hoist `start` outside the loop, or use the fact that all keys in one response are the same year. Performance-only, almost certainly imperceptible.

- **P6.** `archive.ts:6` and `forecast.ts:6` both declare `const TIMEOUT_MS = 4000` independently. Trivial duplication. Move to `try-providers.ts` as the default `timeoutMs`. Out of scope per "no shared helper" rule? Arguably the same micro-DRY exception applies — the constant is conceptually about the orchestrator timeout, not the archive vs. forecast distinction.

- **P7.** `api/current.ts:7` declares `headers?: Record<string, string | string[] | undefined>` in `VercelLikeRequest` but never reads request headers anywhere in the handler. Drop the field, or wire it through. Same in `api/normals.ts:9` — pre-existing, but `current.ts` copy-pasted it. Cosmetic.

- **P8.** `api/_lib/weather/sun.ts:78` uses `new Date(Date.UTC(year, m, 15, 12))` — implicit hour `12` UTC (noon). For most timezones this is fine, but for Pacific timezones (e.g. UTC−11 American Samoa, Niue), noon UTC = 01:00 local same day. Sunrise/sunset on the 15th still computes correctly because `solarEvent` returns a UT Date, and `Intl.DateTimeFormat` with `timeZone` converts. No bug, just confirming.

- **P9.** Comment on `api/_lib/weather/try-providers.ts:14` says "Tries each provider in order. Each call gets its own AbortController with the given timeout." Worth one more sentence: "Timers are cleared in `finally` so no leaked `setTimeout` survives the loop." This was the spec author's stated concern (in the review brief) and the code answers it correctly — surface that in the comment.

---

## Skipped (explicitly out of scope per review brief)

- `parseQuery` / `bad` / `ID_RE` duplication between `api/normals.ts` and `api/current.ts` — intentional, per the plan.
- No tests for HTTP fetch glue — intentional, per the plan.
- Temporary build break between `ae33e91` and `d07cdbf` — intentional, called out in the commit message.
- `aggregate()` losing its upstream sunrise/sunset — intentional, by design.
- `vite.config.ts:291` dev-server registration — out of plan but necessary, called out.

---

## Verdict

**Not approved as-is.** Two pre-merge fixes recommended:

1. **C1**: Non-empty assertions in both archive providers. ~6 lines of code, no test changes needed (existing tests still pass; add one negative test if you want).
2. **I1**: Decide what to do about the polar fallback. Either fix the contract to return null/sentinels and handle in UI, or remove Murmansk/Norilsk from the catalog, or document as a known visible bug with a follow-up ticket. The current state ships a visible incorrectness.

Everything else (I2–I6, P1–P9) can ship in this PR or a follow-up. I2 (User-Agent URL) is a 1-line fix and worth doing now since it's a ToS issue with MET Norway.

After C1 + I1 are addressed: ship it.

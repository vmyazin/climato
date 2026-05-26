# Cluemato — Design Spec

_Date: 2026-05-26_

## What it is

A 10-round climate guessing game at `/game/cluemato`. Each round shows a label-free terrain map of a mystery city plus two climate clues. The player picks from four city options. Score accumulates as you go; full results appear after round 10.

The route structure `/game/cluemato` leaves room for future games at `/game/*`.

---

## Architecture

### Session endpoint

`GET /api/game/cluemato/session`

Returns all 10 rounds upfront as a single JSON payload. No mid-game API calls. Shape:

```ts
type GameSession = {
  rounds: Round[]
}

type Round = {
  lat: number
  lon: number
  clue: string               // e.g. "January high: 28°C · rains a lot in August"
  options: string[]          // 4 city names, shuffled
  answerIndex: number        // index of correct city in options
}
```

Server-side logic per round:
1. Pick a random mystery city from `data/cities.tsv`
2. Fetch its climate normals via existing `/api/normals` logic
3. Distill normals into a clue string (see Clue Generation)
4. Pick 3 decoys (see Decoy Selection)
5. Shuffle all 4 options, record answer index

### Client route

`/game/cluemato` — React route, all game state held client-side:
- `session: GameSession` (fetched on mount)
- `currentRound: number` (0–9)
- `answers: (number | null)[]` (player's pick per round)
- `score: number`

---

## Game flow

1. Page loads → fetch session → show round 1
2. **Round view:**
   - Top bar: `Cluemato` · `3 / 10` · `2 correct`
   - Map: Stadia Stamen Terrain Background tiles, zoom ~8, no city marker, no interaction (scroll/pan disabled)
   - Clue text below map
   - Four city name buttons
3. Player taps a button → correct flashes green / wrong flashes red → 600ms → auto-advance to next round. No reveal between rounds.
4. After round 10 → **Results screen:**
   - Final score (e.g. "7 / 10")
   - List of all 10 cities: city name, player's answer, correct/wrong indicator
   - "Play again" button → fetches a fresh session

---

## Clue generation

Two facts, computed server-side from the city's normals. Chosen from different months when possible to maximise geographic signal.

**Temperature fact** — the month whose high deviates furthest from 20°C (i.e. max of `|high − 20|` across all months). In practice: hot cities get their hottest month, cold cities get their coldest month, mild cities get whichever endpoint is more extreme.
- Hot: `"July high: 38°C"`
- Cold: `"January high: −12°C"`
- Mild (e.g. San Francisco): `"August high: 22°C"`

**Precipitation descriptor** — wettest or driest month, expressed qualitatively:

| Monthly precipitation | Descriptor |
|-----------------------|------------|
| < 20 mm | "barely rains in [month]" |
| 20–60 mm | "some rain in [month]" |
| 60–120 mm | "rains a lot in [month]" |
| > 120 mm | "very wet in [month]" |

Combined: `"January high: 28°C · rains a lot in August"`

---

## Decoy selection

3 decoys picked from `data/cities.tsv` by closest population (within one order of magnitude). Filtered to exclude:
- The correct city itself
- Cities in the same country (too easy to eliminate by region)
- Cities already used in the current session

Shuffled before sending so the correct answer has no positional bias.

---

## Map configuration

Swap `TopoMap.tsx` tile URL for the Stadia Stamen Terrain Background style (label-free raster terrain). Requires a free Stadia Maps account for production use (~2,500 credits/month free tier, sufficient at demo-app traffic). API key stored in `VITE_STADIA_API_KEY` (public env var — standard for map tile services). Injected into the tile URL on the client.

Game map differences from the existing `TopoMap`:
- Zoom ~8 (wider regional view vs current zoom 11)
- No city marker
- `scrollWheelZoom={false}`, `dragging={false}`, `doubleClickZoom={false}` — fully locked

---

## Out of scope

- Daily seed / Wordle-style shared score
- Leaderboard or persistent scoring
- Difficulty levels
- Timer per round

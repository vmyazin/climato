---
sketch: 001
name: page-structure
question: "What's the overall page structure when a calendar leads the comparison page?"
winner: "C"
tags: [layout, structure, comparison]
---

# Sketch 001: Page Structure

## Design Question
The comparison page is calendar-led (we want users to answer "when should I visit each?"). But where does the calendar live, and what flanks it? Three macro arrangements to compare.

## How to View
```
open .planning/sketches/001-page-structure/index.html
```

## Variants
- **A: Calendar Hero** — The dual-city + overlap calendar fills the fold. Stats strip, overlay chart, and side-by-side monthly tables stack below. Pure "decision-aid first, deep data second" reading order.
- **B: Verdict + Calendar** — Editorial city headers up top (PARIS · VS · LONDON), a pulled-quote *verdict band* with the headline differential ("Paris runs 2°C warmer..."), then the calendar, then deep data. Reads more like an article.
- **C: Sticky Calendar Split** — The calendar is pinned to the left column as a sticky widget. The right column scrolls through stats, charts, narrative, and tables. The "when" answer stays visible no matter how far down the user scrolls. Mobile would stack the calendar at top.

## What to Look For
- **Reading order**: In A, the calendar is the first thing — does that work, or do you want a more conventional "headline first" feel like B?
- **Verdict band (B only)**: Does the pulled-quote verdict feel like added value, or noise above the actual data?
- **Sticky calendar (C only)**: Is having the calendar always visible useful, or does the narrow content column feel cramped?
- **Use of color**: City A is red, City B is navy. Are the two distinguishable enough? Too clashing?
- **SEO surface**: B and C both have more prose; A is more data-forward. Which fits the Climato voice?

## Decisions made during iteration

1. **Color palette swap** — Brand red (#cc3b1f) was too alarming when used as one of two city identifiers. Switched to deep teal (#1d5a52) for City A and warm ochre (#b08229) for City B. Brand red now reserved exclusively for verdict-word emphasis. Saved as a feedback memory (`feedback_colors_brand_red.md`).
2. **C refinements** — Headline scaled up ~3x to match VariationA's hero scale (`clamp(80px, 13vw, 168px)`), with `vs` rendered as a small muted connector (0.4em, vertical-align lifted). Tables pulled out of the split-layout right column and rendered full-width below using the `.data-table` + `.col` pattern from Sketch B, so each city's monthly breakdown gets a comfortable half-page column.
3. **Stress test wired in** — The sketch toolbar's second dropdown swaps the headline, table h2s, and country sub-line through progressively longer city names (medium → long → hyphenated → extreme) so the typography can be eyeballed under real-world worst cases.

## Winner: C (Sticky Calendar Split)

Reading order: huge hero headline → sticky calendar always-visible while user scans stats / chart / narrative → full-width side-by-side monthly tables below. The "when should I visit?" answer stays anchored as the user reads everything else.

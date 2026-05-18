---
sketch: 002
name: best-months-calendar
question: "How does the dual-city 'best months' calendar visualize per-city suitability and the overlap?"
winner: "A"
tags: [component, calendar, novel]
---

# Sketch 002: Best-Months Calendar

## Design Question
The calendar is the load-bearing novel component of the comparison page (settled in Sketch 001). It needs to answer three questions at a glance: when is each city ideal, when is each city poor, and when are both ideal at the same time. Three meaningfully different visualizations to compare.

## How to View
```
open .planning/sketches/002-best-months-calendar/index.html
```

Each variant is shown in **two presentation contexts** side by side:
1. **Sidebar (420px)** — its primary home in Sketch 001 C's sticky left column
2. **Full-width** — how it scales for mobile (calendar stacks on top) or full-page placements

## Variants

- **A: Paired Heatmap Rows** — Two rows of 12 discrete cells (one per city), a third row showing where both peak. This is the version currently in Sketch 001 C, included as baseline.
- **B: Diverging Bars** — Each month has a Paris bar growing UP from a center axis and a London bar growing DOWN. Where both peak, a dot marks the axis. Reads as a pulse / tug-of-war.
- **C: Suitability Curves** — Continuous filled SVG curves; overlap emerges automatically from color compositing (teal + ochre → olive). Feels chart-like, less calendar-like.

## What to Look For
- **At-a-glance "when?"**: Which variant lets you answer "when should I visit both?" fastest?
- **Density**: Which fits the 420px sidebar most comfortably without feeling cramped?
- **Climato-native**: Does the variant match the editorial chart language of the existing site, or fight against it?
- **Overlap clarity**: How clearly does each communicate that some months are best for *both*?
- **Direction asymmetry (B)**: Does "London goes down" feel pejorative, or does the labeling neutralize it?
- **Continuous vs discrete**: A and B encode discrete suitability scores; C smooths them. Which fits better?

## Winner: A (Paired Heatmap Rows)

Confirms the approach already in Sketch 001 C — discrete cells are most scannable, the dedicated "★ both" row keeps overlap unambiguous, and it works equally well in the 420px sidebar and at full width. B's diverging-bars treatment introduced an up/down hierarchy that read as "London is the loser"; C's smooth curves lost the calendar affordance.

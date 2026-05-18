---
sketch: 003
name: headline-stat-band
question: "What style of headline differential-stats band fits the comparison page?"
winner: "C"
tags: [component, typography, stats]
---

# Sketch 003: Headline Stat Band

## Design Question
The comparison page needs a tight, scannable band of differential stats (temperature delta, rainfall delta, sunshine delta, peak overlap). Three approaches that vary in tone — data-forward, editorial, or competitive — and in how much they pre-chew the takeaway for the user.

## How to View
```
open .planning/sketches/003-headline-stat-band/index.html
```

## Variants

- **A: Big-Typography Cards** — Four-up grid of stat cards. Each shows the two city values as a slashed pair (`15.6 / 13.6 °C`) with a mono-label delta line beneath. Same pattern as Sketch 001 C; included as baseline.
- **B: Wide Stat Strip** — Each stat is a short verdict sentence ("Paris runs 2°C warmer on average"). Reads as English, not data. Differential is the headline, raw numbers de-emphasized.
- **C: Versus Diptych** — Each stat is a face-off — city A on left, city B on right, differential pulled into a center "referee" column. Most dramatic. Vertical.

## What to Look For
- **Comprehension speed**: Which lets the user grasp "what's the difference?" in one glance?
- **Tone**: A is neutral/data, B is editorial/conversational, C is competitive/sports. Which fits Climato's voice?
- **SEO surface**: B hides the raw digits in prose; A and C surface them. Which is better for search?
- **Mixed-comparison robustness**: If Paris doesn't win every category (mixed picture), which variant degrades gracefully?
- **Vertical weight**: C is taller. Is the drama worth the page real estate?

## Decisions made during iteration

1. **City subheadings added** — On user feedback, a persistent header row was added to C with the two city names in big display type (56px) + country/admin1 sub-lines. The "vs" in the center column matches the small-italic-style "vs" connector used in the Sketch 001 C headline. Per-row metric tags were simplified to just the metric name (e.g. `AVG HIGH`) since the column owner is now established at the top.

## Winner: C (Versus Diptych)

Each metric becomes a single readable face-off — Paris on the left, London on the right, the differential called out in a center "referee" column. The persistent city header at the top anchors which side is which. Most dramatic of the three options, mirrors the page identity (PARIS vs LONDON) most literally, and reads naturally for travel-decision intent.

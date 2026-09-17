# City discovery data manifest
Date: 2026-09-12
Scope: all four directions use London (2643743), Slough (2637627), Woking (2633709), Basildon (2656194). Counts below refer to this four-record fixture, not the whole catalog.

| Element | Source / derivation | Class | Count |
|---|---|---|---|
| City name | data/cities.tsv → name | ✅ Real | 4/4 |
| Country | data/cities.tsv → country | ✅ Real | 4/4 |
| Region | data/cities.tsv → admin1 (England) | ✅ Real | 4/4 |
| Distance from London | Haversine from catalog lat/lon, rounded km | ✅ Real (derived) | 3/3 neighbors |
| City link | /uk/england/{city}; existing toSlug convention | ✅ Real | 3/3 destinations |
| Comparison link | /compare/uk/england/london/vs/uk/england/{city}; toCompareSlug | ✅ Real | 3/3 routes supported; not a claim all are prerendered |
| Mean monthly high (B) | data/normals/{id}.json → mean(high) | ⚠️ Sometimes | 3/4 total; 2/3 neighbors |
| Annual rainfall (B) | data/normals/{id}.json → sum(precip) | ⚠️ Sometimes | 3/4 total; 2/3 neighbors |
| Basildon climate values | No committed normals for 2656194; shown as “Not cached” | ⚠️ Sometimes | 1/3 neighbors missing |
| Country/region destination pages | Proposed catalog-driven directory | ❌ Aspirational | 0/2 implemented pages verified in this exploration |
| Explicit comparison recommendations | Manual same-fixture selection; nearest-city candidates | ❌ Aspirational | 0 recommendation rules implemented by this artifact |

## Sample values
- Slough: 33 km; mean monthly high 14.8°C; annual rain 725 mm.
- Woking: 37 km; mean monthly high 14.8°C; annual rain 724 mm.
- Basildon: 41 km; mean monthly high Not cached; annual rain Not cached.

Implementation constraints: reuse actual slug and nearby helpers; show temperature statistics only when available; retain crawlable city/comparison links in initial HTML; create directory routes before enabling country/region navigation. No popularity, climate-similarity, or travel-time claims are made. This artifact is a design comparison, not production code.

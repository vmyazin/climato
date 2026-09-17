# Option A implementation manifest
Reference: city-discovery-A.reference.html
Fixture: London + Slough, Woking, Basildon.

| Element | Source | Class | Count | Decision |
|---|---|---|---|---|
| Origin city | GeoCity.name | Real | 1/1 | Bind current city |
| Nearby city names | catalog / nearby API | Real | 3/3 | Use existing nearest-city candidates |
| Distance | findNearest → distance_km | Real | 3/3 | Preserve distance formatting |
| City destination | toSlug | Real | 3/3 | Existing route helper |
| Comparison destination | toCompareSlug(origin, neighbor) | Real | 3/3 | Add crawlable anchors to client and static HTML |
| Region/country directories | Not implemented | Aspirational | 0/2 | Approved final design: build country directories, with region anchors on the same page |
| Neighbors for isolated cities | findNearest returns 0–5 | Sometimes | Existing implementation handles empty set | Design intentional empty state during implementation |

No climate metrics are required by A; missing Basildon normals do not affect its row.

## Revision: comparison action treatment
User feedback: remove or improve the last column. Removed the dedicated comparison column and its “With London” heading. Comparison anchors now appear as compact outlined secondary actions beneath each city name; distance remains right-aligned. The action spells out the origin city. Applied to both the exploration and standalone reference.

Revision: city and comparison anchors now share a split control. Origin context (“compare with London”) appears once in the list header; each comparison keeps a full accessible label naming both cities.

## Implementation decisions
- Final design approved. Country and region links are real: region navigation targets a named section within its country directory.
- Retain the existing five-neighbor limit instead of hardcoding the three-row fixture.
- The mock’s miniature CLIMATO masthead is context only; the app already has its own header.
- Empty neighborhoods retain the panel and directory links. Loading and failed requests have readable status copy; failed requests offer retry.
- Country directory data is generated at build time; it adds no client catalog download.

## Implementation verification — 2026-09-12
- Production build passed: 172 directory pages (country pages plus index), 3,287 cached city pages, and 1,225 comparison pages.
- All 82 tests passed, including discovery URL and directory grouping business logic.
- Browser screenshots inspected at 1,229px width: London with five results, Reykjavík with zero results, and the England directory anchor destination.
- Approved typography and grouped city/compare control are present. Deliberate differences: five real results instead of three mock rows; existing app masthead retained; regional browsing uses anchored country sections.
- Mobile CSS is implemented; a mobile browser screenshot has not been verified in this pass.

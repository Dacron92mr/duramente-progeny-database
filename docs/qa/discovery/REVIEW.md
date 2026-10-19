# Discovery and hierarchy release review — 2026-10-19

This iteration implements the four P0 items in the latest design review. Standalone profile routing, bottom navigation and representative-horse editorial pages remain outside this release.

## Changes

- A compact overview introduces the database and links to G1 winners, same-age cohort analysis and pedigree. Counts are derived from the full horse catalogue using existing achievement semantics. The desktop overview measures approximately 225px at 1440px width and can be collapsed.
- Search, filters and sorting share a search area; density and export sit beside the table heading. The graded shortcut reads “重赏冠军（含 G1）”; its unchanged original G1/G2/G3 classification is explained in a disclosure.
- Horse names, section headings and chart titles have distinct sizes. Repeated subsection English kickers are hidden, while page identity remains.
- Cohort analysis opens with same-age cumulative wins and graded performance. Secondary earnings, distance and growth charts remain available in named disclosures. Other crowded annual, maternal-sire, farm and broodmare chart groups use the same pattern. Core professional tabs, A/B comparison, chart enlargement, filters and complete tables are preserved.
- Charts are redrawn after a disclosure opens so they have real dimensions in Chromium and WebKit. Their controls remain attached to their original cards.

## Data integration

Merged the weekly update `1af6d60` into the feature branch before release. Original horses, race records, verified translations and photo catalogue match that upstream commit byte for byte. Conflicting derived aggregates were regenerated from those current records with the PR's synthetic-course classifications. The old fixed 1,257-win regression expectation was replaced by a reconciliation against actual source records (now 1,260 eligible winning-distance records).

## Visual evidence

Only representative screenshots of the product are retained; no third-party reference screenshots or downloaded horse photos are included.

- [Desktop overview and list](home-desktop.png)
- [Mobile overview and list](home-mobile.png)
- [Desktop core cohort charts](cohort-desktop.png)
- [Mobile core chart, dark WebKit](cohort-mobile-dark.png)

The expanded overview intentionally uses some first-screen space. List-density measurements refer to the collapsed overview, not the first visit. Mobile defaults to horse cards.

## Validation

The discovery browser regression covers 390, 430, 768 and 1440px in light/dark modes, overview links, density controls, core chart visibility and every secondary chart's expansion and rendered canvas. Existing suites cover list/search/filter/CSV, profiles, photo switching and fallback, A/B synchronization, map markers, touch interaction and jurisdiction switching. Test logs and bulk screenshots are temporary outputs, not public site assets.

Final results: 32 Node tests, 32 Python tests, six chart/data checks, 26 UI checks, profile/research/photo/grade-map/post-merge suites, the new Chromium/WebKit discovery suite and four WebKit mobile touch cases passed. No JavaScript runtime errors were reported. The collapsed compact table retains seven full 70px rows at 1440×900.

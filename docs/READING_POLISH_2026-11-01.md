# Reading polish — November 1, 2026

Applied Taste Skill's app-screen direction, keeping the existing system font, neutral surfaces and racing semantics. Chosen direction: framed-sheet; its quiet surface hierarchy is used without introducing a new shell. No palette redraw or replacement imagery.

The catalogue's primary job is finding a horse. At mobile widths its overview starts collapsed and remains expandable; the first horse moves from approximately 735px to 450px in a 390px viewport. Desktop retains the overview. Four pedigree categories are visible without a horizontal strip; decorative indices and duplicate tab captions yield to a neutral segmented control. Color remains on racing grades and pedigree data.

Full Profile places the career summary directly after the existing photo in the first column. The same summary is removed from the racing column. Mobile header avoids repeating the horse name before the identity block; scrolling restores a compact name. Photos retain the existing node and contain behavior when switching views. Source links remain accessible and visually secondary.

Reviewed prior work: keep PR #6's explicit link purpose and compact mobile citation rendering; keep profile refinement's event deduplication and quiet group separators. Latest main's Cross, summary facets, JBIS queue, search-history, chart-lifecycle and browser-CI changes were merged without changing their implementation. This PR introduces no data changes relative to current main.

ROUND 1
Seen in one second: a searchable catalogue, then horse identity and racing facts.
Idea: Duramente's five generations are the research material, and the interface makes them immediately available.
Live thing: search, profile mode switching, pedigree categories and data drill-down.
Top changes: move the mobile catalogue above the fold; remove competing pedigree navigation decoration; bring photo and career facts together.

Validation: 53 Node tests and 76 Python tests pass. Chrome and WebKit checks pass at 390/430/768/1440 in both themes. Existing Profile browser regression passes desktop/mobile and both themes. Representative screenshots are in docs/qa/reading-polish. No third-party photo screenshots are committed.

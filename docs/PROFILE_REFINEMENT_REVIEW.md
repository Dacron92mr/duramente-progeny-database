# Profile refinement — 2026-10-26 (not published)

Removed the redundant legacy sibling disclosure, keeping source catalogs intact. Identical affiliation observations collapse across whitespace, parentheses and East/West aliases. Distinct known owners, trainers, regions and returns to previous affiliations remain separate. Single unchanged affiliation is already represented in People and Breeder, so no separate history is rendered. Collection dates are omitted from the public history; sources remain available for actual changes.

Internal navigation uses a forward arrow; external sources retain the diagonal arrow. Chart expansion uses its own expansion symbol.

Added HKJC's Nebra Disk translation from the user's bilingual official screenshot (see HKJC_NAME_EVIDENCE.md). Added Dark Eclipse's confirmed retirement and separately announced future teaser role from Yano Farm's original-post screenshot, linked to https://x.com/yanofarm1/status/2114552849350918493. The source was reviewed on October 26; no precise retirement or employment-start date is inferred. No race is fabricated from the farm's statement of 31 starts and 3 wins.

Validation: 48 Node tests and 55 Python tests pass. Chrome and WebKit career/profile checks pass at 390, 430, 768 and 1440 pixels in both themes; these changes are not published.

## Weekly sync failure investigated from the downloaded artifact

Run 40272108718 completed 673 of 725 horses, with 52 career/race count mismatches and 104 retries. No update was applied. The report was downloaded through the user's signed-in Safari session to ~/Downloads/sync-report.json.

51 affected existing histories have the netkeiba DNF abbreviation `中`. The new freshness check recognized only `中止`, excluding genuine starts. The correction recognizes `中`/`中止` and `失`/`失格`, while `取`/`取消` and `除`/`除外` remain non-starts. Existing missing-history and conflicting-result safeguards remain intact.

The remaining horse is Lord Freude (264, netkeiba 2022100613). Its visible source page on October 26 now shows 12 starts and 12 race rows, including October 25. The artifact does not record its failed snapshot counts, so the earlier mismatch cannot be retrospectively diagnosed with certainty. Do not describe all 52 failures as proven abbreviation errors.

Failures now print source, horse ID, expected starts, parsed starts and row count directly in the logs. Tests exercise both abbreviations and long forms, preserve rejection of missing results, and replay the 51 existing affected histories without modifying records. No full live batch or deployment has been claimed.

## Targeted reconciliation — October 27 Hong Kong time

The production command `python3 scripts/weekly_sync.py --source netkeiba --horse-id 264 --jbis-limit 0 --report /private/tmp/lord-freude-check/production-report.json` completed successfully without retries. Profile: 12 starts; static: 12 rows; dynamic: 12 rows. Both result sources include race 202605040907, October 25, finish 8. Merge, rebuild and dataset validation passed in staging (domestic race rows 11078 → 11079). No production data was changed by this dry run. The later apply attempt was not executed because automatic approval review returned HTTP 403.

Temporary source update skew is a plausible explanation for this one historical mismatch, not a proven diagnosis: the failed historical snapshots were not preserved. Each retry now records career text, static/dynamic row counts, race IDs, latest dates, nonnumeric outcomes and the error, including failed attempts. Manual Actions runs accept `horse_id` for a targeted retry; unknown IDs and combinations with batch limits are rejected. Partial runs cannot advance the global freshness date or pretend to perform the full JRA cross-check. Existing Monday/Tuesday reconciliation and bounded retries remain; invalid batches are still withheld rather than silently published.

## Reader-facing polish — October 28

Profiles now use one quiet surface per major column, with internal separators instead of nested cards. Pedigree roles retain their semantic colors as slim accents. Shorter headings, more readable body text, and consistent spacing establish hierarchy. Empty registration sections are omitted; event qualifications and source details are collapsed without dropping original data. Confirmed roles and announced plans remain distinct. Screenshots are kept outside the repository in /private/tmp/duramente-refined; external photos were deliberately blocked in browser tests to check the fallback link.

## October 28 online sync fix

The October 27 Gmail alert points to run 40454293095 on old main 557657c. Its artifact contains exactly 51 count mismatches; all match existing histories containing 中. Lord Freude passed. Sync-only PR #5 passed GitHub checks and merged as 0a836ff1a1d422972150c338b7317dd8f8f380ea. A new complete apply run, 40615306229, was dispatched on that exact SHA and is running. Do not describe dataset refresh as complete before its outcome is verified. UI/data refinements remain local and are not included in PR #5.

Same-source, same-date confirmed retirement announcements already expressed in a post-racing summary are no longer rendered as a second registration section. Genuine registration cancellations/transfers and independent announcements remain. Regression suite: 49 Node tests.

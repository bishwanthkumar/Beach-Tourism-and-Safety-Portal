---
title: 'Persist intentional beach searches'
type: 'feature'
created: '2026-10-19'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'e2aa6673471e1eb9238b01f271928964d3076377'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Beach history is currently written as a side effect of the beach lookup endpoint, which is also called for live autocomplete. This can store partial typing rather than searches the visitor intentionally made.

**Approach:** Save a matching beach search only when the visitor submits the search or selects a matching result. Persist the submitted query and selected beach in MongoDB using the existing history model, and keep autocomplete requests read-only.

## Boundaries & Constraints

**Always:** Only searches that match a beach are recorded. Reuse the existing `SearchHistory` model and current query/beach upsert semantics. If MongoDB cannot save the history entry, report that failure without suppressing otherwise successful beach results.

**Ask First:** None; the user confirmed successful matches only and intentional searches only.

**Never:** Do not record unmatched searches, autocomplete keystrokes, page views, or report submissions. Do not add search interfaces for facilities or reports.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Submitted match | Non-empty query returns a beach | Save query and matched beach to MongoDB | Surface persistence failure; keep beach results usable |
| Selected match | Visitor selects a suggestion/result | Save query and selected beach to MongoDB | Surface persistence failure; keep navigation usable |
| No match | Query returns no beaches | Do not write history | Keep existing no-results feedback |
| Autocomplete | Query changes while typing | Return suggestions without writing history | Keep existing suggestion behavior |

</frozen-after-approval>

## Code Map

- `client/src/api.js` -- frontend API helpers for beach lookup and history recording.
- `client/src/pages/Home.jsx` -- explicit search submission and result-selection flows.
- `client/src/translations/{en,hi,ta,te}.js` -- localized history-persistence failure message.
- `server/server.js` -- beach search and database-backed search-history endpoints.
- `server/models/SearchHistory.js` -- existing MongoDB schema and unique query/beach key.

## Tasks & Acceptance

**Execution:**
- [x] `server/server.js` -- make beach lookup read-only for history and add a validated history-write endpoint -- separate intentional history writes from autocomplete.
- [x] `client/src/api.js` -- add a helper to submit query/beach history records -- keep endpoint use centralized.
- [x] `client/src/pages/Home.jsx` -- record successful form searches and selected results only -- avoid writing autocomplete or non-search browsing.
- [x] `client/src/translations/{en,hi,ta,te}.js` -- add localized save-failure feedback -- clearly surface persistence failures.

**Acceptance Criteria:**
- Given the visitor types a query and receives autocomplete suggestions, when no search is submitted or result selected, then no history write occurs.
- Given a search or selected result matches a beach, when the visitor submits or selects it, then the query and beach are persisted in MongoDB.
- Given a query has no matching beach, when the visitor searches, then no history entry is created.
- Given a history write fails, when results are otherwise available, then the visitor can still use the results and sees an explicit persistence error.

## Verification

**Commands:**
- `npm run build` from `client` -- expected: Vite production build succeeds.
- `node --check server.js` from `server` -- expected: backend syntax check succeeds.
- Inspect search-history request behavior -- autocomplete sends no history writes; submit/select sends one.

## Suggested Review Order

**Intentional search capture**

- Form submissions persist the first successful match; selected suggestions persist their chosen beach.
  [`Home.jsx:90`](../client/src/pages/Home.jsx#L90)
- Result selection records the typed query and selected beach before navigation.
  [`Home.jsx:61`](../client/src/pages/Home.jsx#L61)

**Database validation and persistence**

- The write endpoint validates Mongo availability, selected beach, and query-match consistency.
  [`server.js:609`](../server/server.js#L609)
- The existing upsert stores the query/beach pair and refreshes its search timestamp.
  [`server.js:436`](../server/server.js#L436)

**Client API and error feedback**

- A dedicated client request keeps persistence separate from autocomplete lookups.
  [`api.js:17`](../client/src/api.js#L17)
- Persistence failures have localized user-facing copy.
  [`en.js:43`](../client/src/translations/en.js#L43)

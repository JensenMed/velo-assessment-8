# Solution

Notes on what I changed and why. Tried to keep it to the brief.

## Backend

**Async I/O.** Swapped the sync fs calls in `routes/items.js` for `fs/promises`
and made the handlers async. Same logic, just non-blocking.

**Validation on POST.** Added a quick check that `name` is a non-empty string
and `price` is a non-negative number. Returns 400 if not. Nothing fancy,
no zod or anything.

**Stats caching.** `routes/stats.js` was re-reading the file on every hit.
Now it caches the result in a module variable and uses `fs.watch` on the
data file to invalidate. First request after a write recomputes, the rest
are basically free. The cache is per-process so this wouldn't survive
clustering, but for one node it's fine.

**Bootstrap.** `index.js` was importing `chai-as-inserted` which doesn't
exist and was crashing the server on start. Removed it and the dep. Also
exported `app` so tests can mount it without binding a port, and added a
small JSON error handler.

**Tests.** Jest + supertest in `routes/__tests__/items.test.js`. Mocked
`fs/promises` so tests don't touch the real data file. Covers list,
search, pagination, 404, POST happy path, and three POST validation
failures.

## Frontend

**Memory leak.** The `active` flag in `Items.js` was set but never read.
Switched to `AbortController` and pass the signal into `fetchItems`. The
effect aborts on cleanup, which both stops the setState and cancels the
request.

**Pagination + search.** Server takes `q`, `page`, `limit` and returns
`{ items, total, page, limit }`. Client has a search input that's debounced
300ms and Prev/Next buttons. Reset to page 1 whenever the query changes.
Page size is 50.

**Virtualization.** Used `react-window`'s FixedSizeList. With only 5 rows
in the seed file you don't really see the benefit, but if you bump the
data file to a few hundred items it stays smooth.

**UI.** Added a small index.css. Loading state, empty state, error banner,
labels on the search input. Nothing crazy.

**ItemDetail.** Same AbortController treatment, plus a back link.

## Things I'd do next if I had more time

- Pull validation into a helper or use zod
- Cursor-based pagination instead of offset (matters at scale, not here)
- Frontend tests with React Testing Library for the search/pagination flow
- Move the stats cache to Redis if this ever ran behind multiple workers

## Run

```bash
cd backend && npm install && npm test
cd ../frontend && npm install && npm start
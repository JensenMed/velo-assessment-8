import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Link } from 'react-router-dom';
import { useData } from '../state/DataContext';

const PAGE_SIZE = 50;
const ROW_HEIGHT = 44;
const LIST_HEIGHT = 480;

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Skeleton() {
  return (
    <ul className="items-skeleton" aria-busy="true" aria-label="Loading items">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="items-skeleton__row" />
      ))}
    </ul>
  );
}

function Items() {
  const { items, total, fetchItems } = useData();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debouncedQuery = useDebounced(query, 300);
  const queryRef = useRef(debouncedQuery);
  queryRef.current = debouncedQuery;

  // Reset to page 1 when query changes
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchItems({
      q: debouncedQuery,
      page,
      limit: PAGE_SIZE,
      signal: controller.signal,
    })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Failed to load items');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [fetchItems, debouncedQuery, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const Row = useMemo(() => {
    return ({ index, style }) => {
      const item = items[index];
      if (!item) return null;
      return (
        <li
          style={{ ...style, listStyle: 'none' }}
          className="items-row"
          role="listitem"
        >
          <Link to={'/items/' + item.id} className="items-row__link">
            <span className="items-row__name">{item.name}</span>
            {item.category && (
              <span className="items-row__category">{item.category}</span>
            )}
            {typeof item.price === 'number' && (
              <span className="items-row__price">${item.price}</span>
            )}
          </Link>
        </li>
      );
    };
  }, [items]);

  return (
    <section className="items" style={{ padding: 16 }}>
      <header className="items__header">
        <h1>Items</h1>
        <label htmlFor="items-search" className="visually-hidden">
          Search items
        </label>
        <input
          id="items-search"
          type="search"
          placeholder="Search items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search items"
          className="items__search"
        />
      </header>

      {error && (
        <div role="alert" className="items__error">
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <p>No items found{debouncedQuery ? ` for "${debouncedQuery}"` : ''}.</p>
      ) : (
        <div role="list" aria-label="Items">
          <List
            height={Math.min(LIST_HEIGHT, items.length * ROW_HEIGHT)}
            itemCount={items.length}
            itemSize={ROW_HEIGHT}
            width="100%"
            outerElementType="ul"
          >
            {Row}
          </List>
        </div>
      )}

      <nav className="items__pagination" aria-label="Pagination">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span aria-live="polite">
          Page {page} of {totalPages} &middot; {total} item{total === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </button>
      </nav>
    </section>
  );
}

export default Items;
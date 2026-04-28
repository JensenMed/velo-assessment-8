import React, { createContext, useCallback, useContext, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const fetchItems = useCallback(async ({ q = '', page = 1, limit = 50, signal } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', String(page));
    params.set('limit', String(limit));

    const res = await fetch(`${API_BASE}/api/items?${params.toString()}`, { signal });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const json = await res.json();

    setItems(json.items || []);
    setTotal(json.total || 0);
    return json;
  }, []);

  return (
    <DataContext.Provider value={{ items, total, fetchItems }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_BASE}/api/items/${id}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(setItem)
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError('Item not found');
        setTimeout(() => navigate('/'), 1200);
      });

    return () => controller.abort();
  }, [id, navigate]);

  if (error) return <p role="alert" style={{ padding: 16 }}>{error}</p>;
  if (!item) return <p style={{ padding: 16 }} aria-busy="true">Loading...</p>;

  return (
    <article style={{ padding: 16 }}>
      <Link to="/">&larr; Back</Link>
      <h2>{item.name}</h2>
      <p><strong>Category:</strong> {item.category}</p>
      <p><strong>Price:</strong> ${item.price}</p>
    </article>
  );
}

export default ItemDetail;
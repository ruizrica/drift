/**
 * Legacy Data Fetcher
 * 
 * ⚠️ VIOLATIONS:
 * - Doesn't use useApi hook pattern
 * - Manual fetch instead of apiClient
 * - No error boundary
 * - Console.log instead of proper logging
 */

import React, { useState, useEffect } from 'react';

// ⚠️ VIOLATION: Should use useApi hook
export function DataFetcher({ url, children }: { url: string; children: (data: any) => React.ReactNode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ⚠️ VIOLATION: Direct fetch instead of apiClient
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        // ⚠️ VIOLATION: Console.log in production code
        console.log('Fetched data:', data);
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        // ⚠️ VIOLATION: Console.error instead of proper error handling
        console.error('Fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [url]);

  // ⚠️ VIOLATION: No loading component, just text
  if (loading) return <div>Loading...</div>;
  
  // ⚠️ VIOLATION: No error component
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return <>{children(data)}</>;
}

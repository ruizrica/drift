/**
 * Legacy User Card
 * 
 * ⚠️ VIOLATIONS:
 * - Doesn't use Card component pattern
 * - Inline styles
 * - No TypeScript props interface
 * - Direct DOM manipulation
 */

import React, { useEffect, useRef } from 'react';

// ⚠️ VIOLATION: Should use proper interface
export function UserCard(props: any) {
  const cardRef = useRef<HTMLDivElement>(null);

  // ⚠️ VIOLATION: Direct DOM manipulation instead of React state
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.opacity = '1';
    }
  }, []);

  // ⚠️ VIOLATION: Inline styles instead of className
  return (
    <div
      ref={cardRef}
      style={{
        border: '1px solid #ccc',
        padding: '16px',
        borderRadius: '8px',
        opacity: 0,
        transition: 'opacity 0.3s',
      }}
    >
      {/* ⚠️ VIOLATION: No null checks */}
      <h3 style={{ margin: 0 }}>{props.user.name}</h3>
      <p style={{ color: '#666' }}>{props.user.email}</p>
      
      {/* ⚠️ VIOLATION: Using OldButton instead of Button */}
      <button
        style={{ marginTop: '8px', background: 'red', color: 'white', border: 'none', padding: '8px' }}
        onClick={props.onDelete}
      >
        Delete
      </button>
    </div>
  );
}

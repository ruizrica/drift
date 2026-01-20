/**
 * Old Button Component
 * 
 * ⚠️ VIOLATIONS:
 * - Uses inline styles instead of className pattern
 * - No TypeScript interface for props
 * - No variant system
 * - Inconsistent naming (OldButton vs Button)
 */

import React from 'react';

// ⚠️ VIOLATION: No interface, using inline type
export function OldButton(props: {
  text: string;  // ⚠️ Should be 'children'
  color?: string;
  onClick?: () => void;
}) {
  // ⚠️ VIOLATION: Inline styles instead of className
  const style = {
    backgroundColor: props.color || 'blue',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  };

  return (
    <button style={style} onClick={props.onClick}>
      {props.text}
    </button>
  );
}

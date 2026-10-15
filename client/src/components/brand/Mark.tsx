import React from 'react';

/** An anvil block: a square frame with a filled core. */
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="1" y="1" width="18" height="18" rx="2" fill="none" stroke="#f5a524" strokeWidth="2" />
      <rect x="5.5" y="5.5" width="9" height="9" fill="#f5a524" />
    </svg>
  );
}

'use client';

import { useState } from 'react';

/**
 * Two-step delete. A single confirm() is easy to click through by
 * reflex; making the button change to "Really delete?" in place forces
 * a second, deliberate tap.
 */
export default function Confirm({
  onConfirm,
  label = 'Delete',
  confirmLabel = 'Really delete?',
  className = 'chip',
}: {
  onConfirm: () => void | Promise<void>;
  label?: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button type="button" className={className} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }

  return (
    <span style={{ display: 'inline-flex', gap: 6 }}>
      <button
        type="button"
        className={className}
        data-on="true"
        onClick={async () => { setArmed(false); await onConfirm(); }}
      >
        {confirmLabel}
      </button>
      <button type="button" className={className} onClick={() => setArmed(false)}>
        Cancel
      </button>
    </span>
  );
}

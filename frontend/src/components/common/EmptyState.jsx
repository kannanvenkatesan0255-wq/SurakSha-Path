import React from 'react';
import { Button } from './Button';

/**
 * EmptyState component.
 * Communicates clearly what is missing and provides a distinct next action.
 */
export function EmptyState({
  icon = '📍',
  title = 'No Data Available',
  description = 'Configure parameters to populate this workspace view.',
  actionLabel,
  onAction,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px dashed var(--color-border-medium)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ fontSize: '2.2rem', marginBottom: 'var(--space-3)' }} aria-hidden="true">
        {icon}
      </div>
      <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
        {title}
      </h4>
      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', maxWidth: '420px', marginBottom: onAction ? 'var(--space-4)' : 0 }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

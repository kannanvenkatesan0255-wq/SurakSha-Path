import React from 'react';
import { Button } from './Button';

/**
 * ErrorState component.
 * Displays understandable, actionable error messages with a recovery action.
 */
export function ErrorState({
  title = 'Service Unavailable',
  message = 'An unexpected error occurred while communicating with the geospatial backend.',
  retryAction,
  retryLabel = 'Retry Connection',
}) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6) var(--space-4)',
        textAlign: 'center',
        background: 'var(--color-risk-high-bg)',
        border: '1px solid var(--color-risk-high-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }} aria-hidden="true">
        ⚠️
      </div>
      <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-risk-high-text)', marginBottom: 'var(--space-2)' }}>
        {title}
      </h4>
      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', maxWidth: '440px', marginBottom: retryAction ? 'var(--space-4)' : 0 }}>
        {message}
      </p>
      {retryAction && (
        <Button variant="secondary" onClick={retryAction} style={{ borderColor: 'var(--color-risk-high-border)' }}>
          🔄 {retryLabel}
        </Button>
      )}
    </div>
  );
}

import React from 'react';

/**
 * LoadingState component.
 * Accessible loading indicator with contextual status description.
 */
export function LoadingState({ message = 'Evaluating contextual safety evidence...' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--color-border-medium)',
          borderTopColor: 'var(--color-brand-blue)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: 'var(--space-3)',
        }}
        aria-hidden="true"
      />
      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
        {message}
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

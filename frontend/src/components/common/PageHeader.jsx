import React from 'react';

/**
 * Reusable PageHeader component for Suraksha Path.
 * Provides consistent heading hierarchy, subtitle, and contextual actions.
 */
export function PageHeader({ title, description, badge, actions, className = '' }) {
  return (
    <div
      className={`page-header ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
        paddingBottom: 'var(--space-4)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <div style={{ maxWidth: '850px', minWidth: 0, flex: '1 1 280px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, margin: 0, overflowWrap: 'break-word', minWidth: 0 }}>
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5, overflowWrap: 'break-word' }}>
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', minWidth: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

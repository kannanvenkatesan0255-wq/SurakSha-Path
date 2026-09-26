import React from 'react';

/**
 * FeedbackMessage / AlertBanner component.
 * Displays success, info, warning, or disclaimer notices with high visual contrast.
 */
export function FeedbackMessage({
  type = 'info', // 'success', 'info', 'warning', 'danger'
  title,
  children,
  onDismiss,
}) {
  const typeStyles = {
    success: {
      bg: 'var(--color-risk-low-bg)',
      border: 'var(--color-risk-low-border)',
      color: 'var(--color-risk-low-text)',
      icon: '✓',
    },
    info: {
      bg: 'var(--color-brand-blue-subtle)',
      border: 'rgba(59, 130, 246, 0.35)',
      color: '#60a5fa',
      icon: 'ℹ',
    },
    warning: {
      bg: 'var(--color-risk-medium-bg)',
      border: 'var(--color-risk-medium-border)',
      color: 'var(--color-risk-medium-text)',
      icon: '⚠️',
    },
    danger: {
      bg: 'var(--color-risk-high-bg)',
      border: 'var(--color-risk-high-border)',
      color: 'var(--color-risk-high-text)',
      icon: '✕',
    },
  };

  const current = typeStyles[type] || typeStyles.info;

  return (
    <div
      role="status"
      style={{
        background: current.bg,
        border: `1px solid ${current.border}`,
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-3) var(--space-4)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        fontSize: '0.85rem',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1rem', color: current.color, lineHeight: 1 }}>
        {current.icon}
      </span>
      <div style={{ flex: 1 }}>
        {title && (
          <strong style={{ display: 'block', color: current.color, marginBottom: '2px' }}>
            {title}
          </strong>
        )}
        <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
          {children}
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss message"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            padding: '2px',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

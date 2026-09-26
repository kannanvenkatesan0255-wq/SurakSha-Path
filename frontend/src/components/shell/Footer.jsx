import React from 'react';
import { APP_CONFIG } from '../../config/appConfig';

/**
 * Footer component.
 * Displays mandatory ethical disclaimer, prototype limitations, and architecture version.
 */
export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--color-surface-panel)',
        borderTop: '1px solid var(--color-border-subtle)',
        padding: 'var(--space-4) var(--space-6)',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max-content-width)',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}
      >
        {/* Ethical Disclaimer Banner */}
        <div
          style={{
            background: 'var(--color-surface-card)',
            borderLeft: '3px solid var(--color-risk-medium)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.78rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.45,
          }}
        >
          <strong style={{ color: 'var(--color-risk-medium-text)' }}>⚠️ Ethical Disclaimer: </strong>
          {APP_CONFIG.DISCLAIMER} Prototype assessment based on available evidence; never claim crime prediction or guaranteed safety.
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            fontSize: '0.76rem',
            color: 'var(--color-text-muted)',
          }}
        >
          <div>
            <strong>SURAKSHA PATH</strong> — Context-Aware Route Intelligence for Chennai, India (Phase 3 UI Foundation).
          </div>
          <div>
            FastAPI REST API • React 19 • SQLite Spatial Graph
          </div>
        </div>
      </div>
    </footer>
  );
}

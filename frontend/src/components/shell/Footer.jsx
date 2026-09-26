import React from 'react';
import { APP_CONFIG } from '../../config/appConfig';

export function Footer() {
  return (
    <footer style={{
      marginTop: 'auto',
      borderTop: '1px solid var(--border-subtle)',
      background: 'rgba(10, 13, 20, 0.95)',
      padding: '1.5rem 2rem',
      fontSize: '0.8rem',
      color: 'var(--text-muted)',
    }}>
      <div style={{
        maxWidth: 'var(--max-content-width)',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          borderLeft: '3px solid var(--safety-amber)',
          padding: '0.75rem 1rem',
          borderRadius: '4px',
          color: 'var(--text-secondary)',
          fontSize: '0.82rem',
        }}>
          ⚠️ <strong>Ethical Disclaimer:</strong> {APP_CONFIG.DISCLAIMER}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong>{APP_CONFIG.APP_NAME}</strong> — Chennai Safe Mobility Research Architecture (Phase 2 Foundation).
          </div>
          <div>
            FastAPI Backend • SQLite Spatial Graph • React 19 Frontend
          </div>
        </div>
      </div>
    </footer>
  );
}

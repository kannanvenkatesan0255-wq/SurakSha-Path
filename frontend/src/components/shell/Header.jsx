import React from 'react';
import { APP_CONFIG } from '../../config/appConfig';
import { Badge } from '../common/Badge';

export function Header() {
  return (
    <header style={{
      height: 'var(--header-height)',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(10, 13, 20, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-sm)',
          background: 'linear-gradient(135deg, #00d2b4 0%, #00f0ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(0, 240, 255, 0.4)',
          fontSize: '1.25rem',
        }}>
          🛡️
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              SURAKSHA PATH
            </h1>
            <Badge variant="healthy" pulse={true}>
              CHENNAI
            </Badge>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
            EVIDENCE-BASED CONTEXT-AWARE ROUTING PROTOTYPE
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          background: 'var(--bg-surface-elevated)',
          padding: '0.35rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
        }}>
          📍 Urban Corridor: <strong style={{ color: 'var(--text-primary)' }}>Chennai Metro Area</strong>
        </div>
      </div>
    </header>
  );
}

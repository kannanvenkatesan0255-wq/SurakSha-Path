import React from 'react';
import { StatusBadge } from '../common/StatusBadge';

/**
 * AppHeader component.
 * Displays brand identity, city context, backend telemetry probe, and mobile menu toggle.
 */
export function AppHeader({
  healthData,
  healthLoading,
  healthError,
  onRefreshHealth,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) {
  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--color-surface-panel)',
        borderBottom: '1px solid var(--color-border-medium)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-6)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand Identity & Urban Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onToggleMobileMenu}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
          className="btn btn-subtle mobile-menu-toggle"
          style={{
            padding: 'var(--space-2)',
            display: 'none',
            fontSize: '1.2rem',
          }}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Brand Icon & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.15rem',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            🛡️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                SURAKSHA PATH
              </span>
              <StatusBadge label="CHENNAI" variant="info" />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', letterSpacing: '0.01em' }}>
              Context-Aware Route Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Right: Live Telemetry Indicator & City Focus */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Backend Connectivity Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'var(--color-surface-card)',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border-subtle)',
            fontSize: '0.78rem',
          }}
        >
          {healthLoading ? (
            <span style={{ color: 'var(--color-text-muted)' }}>Probing API...</span>
          ) : healthData ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="pulse-dot" style={{ color: 'var(--color-risk-low)' }} aria-hidden="true" />
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>API Ready</span>
              <span style={{ color: 'var(--color-text-muted)' }}>|</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>DB: {healthData.database.database_type.toUpperCase()}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="pulse-dot" style={{ color: 'var(--color-risk-high)' }} aria-hidden="true" />
              <span style={{ color: 'var(--color-risk-high-text)', fontWeight: 600 }}>API Offline</span>
              <button
                onClick={onRefreshHealth}
                className="btn btn-subtle btn-sm"
                style={{ padding: '0 4px', fontSize: '0.72rem' }}
                title="Retry API health check"
              >
                🔄 Retry
              </button>
            </div>
          )}
        </div>

        {/* Prototype Tag */}
        <StatusBadge label="PROTOTYPE" variant="status" />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: inline-flex !important;
          }
        }
      `}</style>
    </header>
  );
}

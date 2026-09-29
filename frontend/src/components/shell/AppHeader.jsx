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
  onOpenSosModal,
}) {
  return (
    <header
      className="app-header"
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
        zIndex: 1000,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Brand Identity & Urban Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
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
            flexShrink: 0,
          }}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Brand Icon & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.1rem',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            🛡️
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span className="app-brand-title" style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                SURAKSHA PATH
              </span>
              <span className="header-chennai-badge">
                <StatusBadge label="CHENNAI" variant="info" />
              </span>
            </div>
            <div className="app-brand-subtitle" style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Context-Aware Route Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Right: Live Telemetry Indicator & City Focus */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
        {/* Backend Connectivity Status */}
        <div
          className="header-telemetry"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'var(--color-surface-card)',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border-subtle)',
            fontSize: '0.78rem',
            whiteSpace: 'nowrap',
          }}
        >
          {healthLoading ? (
            <span style={{ color: 'var(--color-text-muted)' }}>Probing API...</span>
          ) : healthData ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="pulse-dot" style={{ color: 'var(--color-risk-low)' }} aria-hidden="true" />
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>API Ready</span>
              <span className="header-db-tag" style={{ color: 'var(--color-text-muted)' }}>|</span>
              <span className="header-db-tag" style={{ color: 'var(--color-text-secondary)' }}>DB: {healthData.database.database_type.toUpperCase()}</span>
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

        {/* Prominent Emergency SOS Header Action */}
        <button
          type="button"
          onClick={onOpenSosModal}
          className="btn header-sos-btn"
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 10px',
            fontSize: '0.8rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
            cursor: 'pointer',
            minHeight: '36px',
            whiteSpace: 'nowrap',
          }}
          aria-label="Open emergency helpline directory"
          title="Open Chennai Emergency Helplines (112, 100, 1091, 108)"
        >
          <span aria-hidden="true" style={{ fontSize: '1rem' }}>🚨</span>
          <span className="header-sos-label">SOS CALL</span>
        </button>

        {/* Prototype Tag */}
        <div className="header-prototype-badge">
          <StatusBadge label="PROTOTYPE" variant="status" />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .app-header {
            padding: 0 var(--space-3) !important;
          }
          .mobile-menu-toggle {
            display: inline-flex !important;
          }
          .header-prototype-badge {
            display: none !important;
          }
        }
        @media (max-width: 540px) {
          .header-db-tag {
            display: none !important;
          }
          .header-chennai-badge {
            display: none !important;
          }
          .app-brand-subtitle {
            display: none !important;
          }
          .app-brand-title {
            font-size: 0.98rem !important;
          }
        }
      `}</style>
    </header>
  );
}

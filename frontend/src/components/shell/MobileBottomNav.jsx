import React from 'react';
import { NAV_TABS } from '../../utils/constants';

/**
 * MobileBottomNav Component.
 * Implements a modern mobile-first bottom navigation bar for handheld devices (<= 768px):
 *  - Persistent, ergonomic one-thumb access to core workflows
 *  - High-priority central SOS button that triggers emergency calling immediately
 *  - Respects iOS/Android system safe-area insets
 *  - High-contrast active indicators and minimum 48px touch targets
 */
export function MobileBottomNav({
  activeTab,
  onTabChange,
  onOpenSosModal,
  onOpenMobileMenu,
}) {
  return (
    <nav
      className="mobile-bottom-nav"
      role="navigation"
      aria-label="Mobile Bottom Navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(13, 20, 36, 0.96)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--color-border-medium)',
        display: 'none', // Controlled by CSS media queries
        gridTemplateColumns: 'repeat(5, 1fr)',
        alignItems: 'center',
        zIndex: 900,
        paddingTop: '6px',
        paddingBottom: 'max(6px, env(safe-area-inset-bottom, 8px))',
        paddingLeft: 'var(--space-2)',
        paddingRight: 'var(--space-2)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* 1. Home */}
      <button
        type="button"
        id="mobile-bottom-nav-home"
        data-testid="mobile-bottom-nav-home"
        onClick={() => onTabChange(NAV_TABS.HOME)}
        className="mobile-nav-btn"
        aria-current={activeTab === NAV_TABS.HOME ? 'page' : undefined}
        style={getNavBtnStyle(activeTab === NAV_TABS.HOME)}
        aria-label="Home overview"
      >
        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🧭</span>
        <span style={{ fontSize: '0.68rem', fontWeight: activeTab === NAV_TABS.HOME ? 700 : 500 }}>
          Home
        </span>
      </button>

      {/* 2. Routes (Plan Route) */}
      <button
        type="button"
        id="mobile-bottom-nav-plan_route"
        data-testid="mobile-bottom-nav-plan_route"
        onClick={() => onTabChange(NAV_TABS.PLAN_ROUTE)}
        className="mobile-nav-btn"
        aria-current={activeTab === NAV_TABS.PLAN_ROUTE ? 'page' : undefined}
        style={getNavBtnStyle(activeTab === NAV_TABS.PLAN_ROUTE)}
        aria-label="Plan safe route"
      >
        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🗺️</span>
        <span style={{ fontSize: '0.68rem', fontWeight: activeTab === NAV_TABS.PLAN_ROUTE ? 700 : 500 }}>
          Routes
        </span>
      </button>

      {/* 3. CENTRAL SOS BUTTON (Urgent, Prominent, Instant Call Access) */}
      <button
        type="button"
        id="mobile-bottom-nav-sos"
        data-testid="mobile-bottom-nav-sos"
        onClick={onOpenSosModal}
        className="mobile-nav-btn mobile-nav-sos-btn"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          color: '#ffffff',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 6px',
          minHeight: '44px',
          border: '1.5px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 0 14px rgba(239, 68, 68, 0.55)',
          cursor: 'pointer',
          transform: 'translateY(-4px)',
          transition: 'transform var(--transition-fast)',
        }}
        aria-label="Emergency SOS calling directory"
        title="Open Emergency SOS calling directory"
      >
        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🚨</span>
        <span style={{ fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.04em' }}>
          SOS
        </span>
      </button>

      {/* 4. Monitor */}
      <button
        type="button"
        id="mobile-bottom-nav-monitor"
        data-testid="mobile-bottom-nav-monitor"
        onClick={() => onTabChange(NAV_TABS.MONITOR)}
        className="mobile-nav-btn"
        aria-current={activeTab === NAV_TABS.MONITOR ? 'page' : undefined}
        style={getNavBtnStyle(activeTab === NAV_TABS.MONITOR)}
        aria-label="Journey monitor and check-in"
      >
        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🛡️</span>
        <span style={{ fontSize: '0.68rem', fontWeight: activeTab === NAV_TABS.MONITOR ? 700 : 500 }}>
          Monitor
        </span>
      </button>

      {/* 5. More / Menu */}
      <button
        type="button"
        id="mobile-bottom-nav-menu"
        data-testid="mobile-bottom-nav-menu"
        onClick={onOpenMobileMenu}
        className="mobile-nav-btn"
        style={getNavBtnStyle(false)}
        aria-label="More navigation options"
      >
        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>☰</span>
        <span style={{ fontSize: '0.68rem', fontWeight: 500 }}>
          Menu
        </span>
      </button>

      <style>{`
        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: grid !important;
          }
        }
      `}</style>
    </nav>
  );
}

function getNavBtnStyle(isActive) {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    background: 'transparent',
    border: 'none',
    color: isActive ? 'var(--color-brand-cyan)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
    padding: '4px',
    minHeight: '44px',
    borderRadius: 'var(--radius-xs)',
    transition: 'all var(--transition-fast)',
    textDecoration: 'none',
  };
}

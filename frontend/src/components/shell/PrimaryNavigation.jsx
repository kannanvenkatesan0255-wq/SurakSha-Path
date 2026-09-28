import React from 'react';
import { NAV_ITEMS } from '../../utils/constants';

/**
 * PrimaryNavigation component.
 * Implements accessible, domain-specific navigation across the 5 primary destinations:
 * 1. HOME
 * 2. PLAN ROUTE
 * 3. EVIDENCE
 * 4. COMMUNITY
 * 5. ACTIVITY
 */
export function PrimaryNavigation({
  activeTab,
  onTabChange,
  isMobileOpen = false,
  onCloseMobile,
}) {
  const handleItemClick = (id) => {
    onTabChange(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <nav
        className="primary-navigation-sidebar"
        role="navigation"
        aria-label="Main Navigation"
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--color-surface-panel)',
          borderRight: '1px solid var(--color-border-subtle)',
          padding: 'var(--space-4) var(--space-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, padding: '0 var(--space-3) var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Navigation
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.ariaLabel}
              className={`nav-item-btn ${isActive ? 'nav-item-active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                background: isActive ? 'var(--color-brand-blue-subtle)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'rgba(59, 130, 246, 0.35)' : 'transparent',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                width: '100%',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ lineHeight: 1.2, overflowWrap: 'break-word' }}>{item.label}</div>
                <div style={{ fontSize: '0.72rem', color: isActive ? '#93c5fd' : 'var(--color-text-muted)', marginTop: '2px', overflowWrap: 'break-word' }}>
                  {item.description}
                </div>
              </div>
              {isActive && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-brand-blue)',
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}

        {/* Ethical Anchor Badge in Sidebar */}
        <div
          style={{
            marginTop: 'auto',
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3)',
            fontSize: '0.74rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.4,
          }}
        >
          <strong style={{ color: 'var(--color-text-secondary)' }}>Principle:</strong> Safety ≠ Distance. Routes are evaluated on road segment telemetry.
        </div>
      </nav>

      {/* Mobile Drawer / Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 199,
          }}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-in Drawer */}
      <div
        className={`mobile-nav-drawer ${isMobileOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          background: 'var(--color-surface-panel)',
          borderRight: '1px solid var(--color-border-medium)',
          zIndex: 200,
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform var(--transition-normal)',
          boxShadow: 'var(--shadow-lg)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
            SURAKSHA PATH
          </span>
          <button
            onClick={onCloseMobile}
            className="btn btn-subtle btn-sm"
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className="btn btn-secondary btn-multiline"
              style={{
                justifyContent: 'flex-start',
                padding: 'var(--space-3)',
                background: isActive ? 'var(--color-brand-blue-subtle)' : undefined,
                borderColor: isActive ? 'var(--color-brand-blue)' : undefined,
                color: isActive ? '#ffffff' : undefined,
                whiteSpace: 'normal',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                textAlign: 'left',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '1.2rem', marginRight: 'var(--space-2)', flexShrink: 0 }}>{item.icon}</span>
              <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, overflowWrap: 'break-word' }}>{item.label}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', overflowWrap: 'break-word' }}>{item.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .primary-navigation-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

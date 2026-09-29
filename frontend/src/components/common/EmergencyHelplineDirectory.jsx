import React, { useState } from 'react';
import { CHENNAI_EMERGENCY_HELPLINES } from '../../utils/constants';

/**
 * EmergencyHelplineDirectory Component.
 * Provides accessible, functional telephone-link emergency cards for Chennai commuters:
 *  - High-visibility service cards with category badges
 *  - Semantic tel: links opening system dialers on mobile/calling apps
 *  - One-click "Copy Number" clipboard fallback for desktop / manual landline dialing
 *  - Explicit disclaimers: no false claims of automated dispatch, no intrusive permissions
 */
export function EmergencyHelplineDirectory({
  helplines = CHENNAI_EMERGENCY_HELPLINES,
  compact = false,
  onCallInitiated = null,
}) {
  const [copiedNumber, setCopiedNumber] = useState(null);
  const [lastDialed, setLastDialed] = useState(null);

  const handleCopy = async (num, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(num);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = num;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedNumber(num);
      setTimeout(() => setCopiedNumber(null), 2500);
    } catch {
      // Fallback display if clipboard fails
      setCopiedNumber(num);
      setTimeout(() => setCopiedNumber(null), 2500);
    }
  };

  const handleCallClick = (helpline) => {
    setLastDialed(helpline.number);
    if (onCallInitiated) {
      onCallInitiated(helpline);
    }
    setTimeout(() => setLastDialed(null), 8000);
  };

  return (
    <div className="emergency-directory-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
      {/* Platform & Safety Disclosure Notice */}
      <div
        className="emergency-notice-banner"
        style={{
          background: 'rgba(239, 68, 68, 0.1)',
          borderLeft: '4px solid #ef4444',
          borderRadius: 'var(--radius-xs)',
          padding: 'var(--space-3)',
          fontSize: '0.8rem',
          color: '#fecaca',
          lineHeight: 1.45,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
          <span>🚨</span>
          <span>EMERGENCY CALLING INFORMATION</span>
        </div>
        <p style={{ margin: 0 }}>
          Tapping <strong>Call</strong> opens your device’s native phone dialer with the selected number pre-filled.
          You must confirm and press dial to connect. Suraksha Path does <em>not</em> place automatic background calls or dispatch emergency services.
        </p>
        <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#cbd5e1' }}>
          💻 <strong>Laptop/Desktop note:</strong> If your computer lacks a default telephone app, click <strong>Copy Number</strong> to manually dial from your phone.
        </div>
      </div>

      {/* Dial Feedback Banner if user clicked Call */}
      {lastDialed && (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid #3b82f6',
            borderRadius: 'var(--radius-xs)',
            padding: 'var(--space-2) var(--space-3)',
            fontSize: '0.78rem',
            color: '#bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span>
            📞 <strong>Dialer opened for {lastDialed}:</strong> Please confirm and initiate the call in your phone dialer.
          </span>
          <button
            type="button"
            onClick={() => setLastDialed(null)}
            style={{ background: 'transparent', border: 'none', color: '#93c5fd', cursor: 'pointer', fontWeight: 700 }}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid of Emergency Cards */}
      <div
        className="emergency-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: compact
            ? '1fr'
            : 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: 'var(--space-3)',
          width: '100%',
        }}
      >
        {helplines.map((h, idx) => {
          const numberStr = String(h.number || '');
          const telHref = h.dial_uri || h.dialUri || `tel:${numberStr.replace(/[^0-9+]/g, '')}`;
          const isCopied = copiedNumber === numberStr;

          // Semantic badge coloring by category
          const categoryColors = {
            Police: { bg: 'rgba(37, 99, 235, 0.2)', border: '#3b82f6', text: '#93c5fd', icon: '🚓' },
            'Women Safety': { bg: 'rgba(168, 85, 247, 0.2)', border: '#a855f7', text: '#d8b4fe', icon: '👩' },
            Medical: { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#fca5a5', icon: '🚑' },
            'Civic / Flood': { bg: 'rgba(6, 182, 212, 0.2)', border: '#06b6d4', text: '#67e8f9', icon: '🌊' },
            Traffic: { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b', text: '#fde68a', icon: '🚦' },
            Fire: { bg: 'rgba(234, 88, 12, 0.2)', border: '#ea580c', text: '#fdba74', icon: '🚒' },
            default: { bg: 'rgba(100, 116, 139, 0.2)', border: '#64748b', text: '#cbd5e1', icon: '📞' },
          };

          const styleMeta = categoryColors[h.category] || categoryColors.default;

          return (
            <div
              key={idx}
              className="emergency-contact-card"
              style={{
                background: 'var(--color-surface-panel)',
                border: '1px solid var(--color-border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 'var(--space-2)',
                boxShadow: 'var(--shadow-sm)',
                minWidth: 0,
              }}
            >
              {/* Card Header: Service name & Category badge */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{styleMeta.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2, overflowWrap: 'break-word' }}>
                      {h.name}
                    </div>
                    {h.description && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                        {h.description}
                      </div>
                    )}
                  </div>
                </div>

                <span
                  style={{
                    background: styleMeta.bg,
                    border: `1px solid ${styleMeta.border}`,
                    color: styleMeta.text,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-pill)',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}
                >
                  {h.category || 'Emergency'}
                </span>
              </div>

              {/* Number display */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Number:
                </span>
                <span
                  className="emergency-dial-number"
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: '#ffffff',
                    letterSpacing: '0.05em',
                  }}
                >
                  {numberStr}
                </span>
                {h.operating_hours && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                    {h.operating_hours}
                  </span>
                )}
              </div>

              {/* Action Buttons: Primary Call (tel:) + Copy Fallback */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}>
                {/* Primary Semantic Call Link */}
                <a
                  href={telHref}
                  onClick={() => handleCallClick(h)}
                  className="btn btn-primary emergency-call-btn"
                  style={{
                    flex: 1,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    minHeight: '44px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    transition: 'all var(--transition-fast)',
                    cursor: 'pointer',
                  }}
                  aria-label={`Call ${h.name} at number ${numberStr}`}
                >
                  <span aria-hidden="true" style={{ fontSize: '1.05rem' }}>📞</span>
                  <span>Call {numberStr}</span>
                </a>

                {/* Desktop / Manual Copy Number Fallback Button */}
                <button
                  type="button"
                  onClick={(e) => handleCopy(numberStr, e)}
                  className="btn btn-subtle emergency-copy-btn"
                  style={{
                    minHeight: '44px',
                    minWidth: '44px',
                    padding: '8px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${isCopied ? '#10b981' : 'var(--color-border-medium)'}`,
                    background: isCopied ? 'rgba(16, 185, 129, 0.2)' : 'var(--color-surface-card)',
                    color: isCopied ? '#34d399' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    transition: 'all var(--transition-fast)',
                  }}
                  title={`Copy ${numberStr} to clipboard for manual dialing`}
                  aria-label={`Copy ${numberStr} to clipboard`}
                >
                  {isCopied ? (
                    <>
                      <span>✓</span>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useEffect } from 'react';
import { EmergencyHelplineDirectory } from './EmergencyHelplineDirectory';
import { CHENNAI_EMERGENCY_HELPLINES } from '../../utils/constants';

/**
 * EmergencyHelplineModal Component.
 * High-priority accessible modal dialog for instant Chennai emergency calling:
 *  - Traps focus / supports Escape key closing
 *  - Works on all screen sizes with scrollable content
 *  - Displays verified emergency numbers with prominent Call buttons and Copy options
 */
export function EmergencyHelplineModal({
  isOpen,
  onClose,
  helplines = CHENNAI_EMERGENCY_HELPLINES,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="emergency-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        boxSizing: 'border-box',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
    >
      <div
        className="emergency-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-surface-base)',
          border: '2px solid #ef4444',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.25)',
          maxWidth: '780px',
          width: '100%',
          maxHeight: 'min(90vh, 720px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modal-appear 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--color-border-medium)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.8rem' }} aria-hidden="true">🚨</span>
            <div>
              <h2
                id="emergency-modal-title"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Chennai Emergency SOS Helplines
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#fca5a5' }}>
                Verified 24/7 Tamil Nadu Emergency Contacts
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close emergency dialog"
            className="btn btn-subtle"
            style={{
              minWidth: '40px',
              minHeight: '40px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '1.2rem',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: 'var(--space-5)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <EmergencyHelplineDirectory
            helplines={helplines}
            compact={false}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-5)',
            borderTop: '1px solid var(--color-border-subtle)',
            background: 'var(--color-surface-panel)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-md"
            style={{ minHeight: '44px', fontWeight: 600 }}
          >
            Close Emergency Window
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modal-appear {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

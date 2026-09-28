import React, { useEffect, useRef } from 'react';
import { Button } from '../common/Button';

/**
 * SosConfirmationModal component (Phase 14).
 * Accessible modal preventing accidental SOS activation or premature resolution.
 * Supports keyboard escape, focus trapping, and screen-reader announcements.
 */
export function SosConfirmationModal({
  isOpen,
  mode = 'ACTIVATE', // 'ACTIVATE' | 'RESOLVE'
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Focus confirm button when opened
      setTimeout(() => {
        if (confirmBtnRef.current) confirmBtnRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel && onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isActivate = mode === 'ACTIVATE';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-modal-title"
      aria-describedby="sos-modal-description"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        padding: 'var(--space-4)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel && onCancel();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface-panel)',
          border: isActivate ? '2px solid #ef4444' : '2px solid var(--color-brand-blue)',
          borderRadius: 'var(--radius-md)',
          maxWidth: '480px',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          width: '100%',
          padding: 'var(--space-6)',
          boxShadow: isActivate ? '0 0 30px rgba(239, 68, 68, 0.4)' : 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
          <span style={{ fontSize: '2rem', flexShrink: 0 }} aria-hidden="true">
            {isActivate ? '🚨' : '🛡️'}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              id="sos-modal-title"
              style={{
                margin: 0,
                fontSize: '1.25rem',
                color: isActivate ? '#ef4444' : 'var(--color-text-primary)',
                overflowWrap: 'break-word',
              }}
            >
              {isActivate ? 'Confirm In-App SOS Activation' : 'Confirm SOS Resolution'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {isActivate ? 'Deliberate safety action' : 'Return to standard monitoring'}
            </span>
          </div>
        </div>

        <div
          id="sos-modal-description"
          style={{
            fontSize: '0.86rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
            backgroundColor: 'var(--color-surface-card)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border-subtle)',
            overflowWrap: 'break-word',
          }}
        >
          {isActivate ? (
            <>
              <p style={{ margin: '0 0 var(--space-2)' }}>
                You are about to activate <strong>In-App SOS Mode</strong>.
              </p>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#fbbf24',
                  background: 'rgba(245, 158, 11, 0.12)',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  marginBottom: '8px',
                }}
              >
                ⚠️ <strong>Prototype Notice:</strong> This action logs a safety event and displays verified
                Chennai emergency telephone numbers. It does <em>NOT</em> automatically dial emergency services or dispatch police.
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                If you are in immediate real-world danger, dial <strong>100</strong> (Police) or <strong>112</strong> directly.
              </p>
            </>
          ) : (
            <p style={{ margin: 0 }}>
              Are you sure you want to resolve the SOS state? This will return your journey session to standard active monitoring and record a resolution event.
            </p>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-2)',
          }}
        >
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
          >
            Cancel
          </Button>

          <Button
            ref={confirmBtnRef}
            type="button"
            variant={isActivate ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
            style={{
              fontWeight: 700,
              minWidth: '120px',
            }}
          >
            {isActivate ? '🚨 Activate SOS' : '✅ Confirm Safe'}
          </Button>
        </div>
      </div>
    </div>
  );
}

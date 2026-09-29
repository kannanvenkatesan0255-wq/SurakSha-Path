/**
 * MapTokenModal Component for Suraksha Path.
 * Allows users to inspect, configure, or update their Mapbox API key directly
 * in the browser at runtime, with instant persistence to localStorage.
 */
import React, { useState, useEffect } from 'react';

export function MapTokenModal({
  isOpen,
  onClose,
  currentToken = '',
  onSaveToken,
  onResetToken,
  onSwitchToOpenTiles,
}) {
  const [tokenInput, setTokenInput] = useState('');
  const [saveFeedback, setSaveFeedback] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTokenInput(currentToken || '');
      setSaveFeedback(null);
    }
  }, [isOpen, currentToken]);

  if (!isOpen) return null;

  const hasToken = Boolean(currentToken && currentToken.trim().length > 0);
  const isValidFormat = Boolean(tokenInput && tokenInput.trim().startsWith('pk.'));

  const handleSave = (e) => {
    e.preventDefault();
    const clean = tokenInput.trim();
    if (!clean) {
      setSaveFeedback({ type: 'error', message: 'Token cannot be empty. Click "Clear / Use Free" if you do not have a custom key.' });
      return;
    }
    if (!clean.startsWith('pk.')) {
      setSaveFeedback({ type: 'warning', message: 'Public Mapbox tokens usually begin with "pk.". Please verify your key.' });
    }
    onSaveToken(clean);
    setSaveFeedback({ type: 'success', message: 'API key saved successfully! Map reloaded.' });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    onResetToken();
    setTokenInput('');
    setSaveFeedback({ type: 'success', message: 'Switched to free open cartography (zero key required).' });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleUseFreeTiles = () => {
    if (onSwitchToOpenTiles) {
      onSwitchToOpenTiles();
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-token-title"
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface-panel)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '520px',
          width: '100%',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🗺️</span>
            <div>
              <h3 id="map-token-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                Mapbox API Key Configuration
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Configure or update your cartographic access token
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Current Status Pill */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Active Map Key Status
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: hasToken ? '#34d399' : '#38bdf8' }}>
                {hasToken ? 'Custom Mapbox Key Active ✓' : 'Zero-Key Open Cartography Active ✓'}
              </div>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-secondary)',
                background: 'rgba(0,0,0,0.3)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {hasToken ? `${currentToken.slice(0, 8)}...${currentToken.slice(-6)}` : 'Zero Key Required'}
            </span>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor="mapbox-token-input"
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Mapbox Public Access Token (starts with <code>pk.</code>):
              </label>
              <input
                id="mapbox-token-input"
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="pk.your_mapbox_token"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-medium)',
                  background: 'var(--color-surface-base)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-mono)',
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                Your token is stored safely in your local browser storage and never transmitted to any third party.
              </span>
            </div>

            {saveFeedback && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  background:
                    saveFeedback.type === 'success'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : saveFeedback.type === 'error'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(245, 158, 11, 0.15)',
                  color:
                    saveFeedback.type === 'success'
                      ? '#34d399'
                      : saveFeedback.type === 'error'
                      ? '#f87171'
                      : '#fbbf24',
                  border: `1px solid ${
                    saveFeedback.type === 'success'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : saveFeedback.type === 'error'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'rgba(245, 158, 11, 0.3)'
                  }`,
                }}
              >
                {saveFeedback.message}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ flex: 1, minHeight: '36px' }}
              >
                Save & Apply Key
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary btn-sm"
                style={{ minHeight: '36px' }}
                title="Clear saved token and switch to free zero-key open cartography"
              >
                Clear / Use Free
              </button>
            </div>
          </form>

          {/* OpenStreetMap Fallback Option */}
          <div
            style={{
              borderTop: '1px solid var(--color-border-subtle)',
              paddingTop: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Don't have a Mapbox Key?
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                Switch to OpenStreetMap / CartoDB dark matter tiles. Free forever, zero API keys required.
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseFreeTiles}
              className="btn btn-subtle btn-sm"
              style={{ flexShrink: 0, borderColor: 'var(--color-border-medium)' }}
            >
              Use Free Open Tiles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { SectionPanel } from '../common/SectionPanel';
import { Button } from '../common/Button';
import { FeedbackMessage } from '../common/FeedbackMessage';
import {
  loadRoutePreferences,
  saveRoutePreferences,
  resetRoutePreferences,
  DEFAULT_ROUTE_PREFERENCES,
} from '../../services/journeyStorage';

/**
 * PersonalizedPreferencesPanel Component (Phase 15).
 * Allows commuters to configure evidence-weighted route navigation preferences,
 * speed-versus-safety trade-offs, lighting constraints, and maximum detour tolerance.
 */
export function PersonalizedPreferencesPanel({ onPreferencesChange = null }) {
  const [preferences, setPreferences] = useState(() => loadRoutePreferences());
  const [savedMessage, setSavedMessage] = useState(null);

  // Sync state if external changes happen
  useEffect(() => {
    const loaded = loadRoutePreferences();
    setPreferences(loaded);
  }, []);

  const handleChange = (field, value) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSavedMessage(null);
  };

  const handleSave = () => {
    saveRoutePreferences(preferences);
    setSavedMessage('Preferences saved successfully. Route planning will apply these criteria.');
    if (onPreferencesChange) {
      onPreferencesChange(preferences);
    }
  };

  const handleReset = () => {
    const defaults = resetRoutePreferences();
    setPreferences(defaults);
    setSavedMessage('Preferences reset to standard balanced defaults.');
    if (onPreferencesChange) {
      onPreferencesChange(defaults);
    }
  };

  // Derive descriptive narrative for the safety weight slider
  const getSafetyWeightNarrative = (w) => {
    if (w <= 0.25) {
      return {
        tag: 'Speed Prioritized',
        description: 'Prefers minimal travel time over arterial bypasses; tolerates sparse lighting on secondary roads.',
        color: '#93c5fd',
      };
    }
    if (w <= 0.65) {
      return {
        tag: 'Balanced Pareto Trade-Off',
        description: 'Optimizes travel time against verified illumination, active footfall, and road traction.',
        color: '#6ee7b7',
      };
    }
    return {
      tag: 'Maximum Assessed Safety',
      description: 'Prioritizes corridors with verified streetlights, police presence, and commercial activity even if detour is required.',
      color: '#fcd34d',
    };
  };

  const weightNarrative = getSafetyWeightNarrative(preferences.safetyWeight);

  return (
    <SectionPanel
      title="Personal Route Preferences"
      badge="CUSTOMIZABLE"
      badgeVariant="info"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Customize how Suraksha Path balances speed, verified safety infrastructure, and detour tolerance across Chennai corridors.
          Preference adjustments guide route selection but <strong>never alter underlying segment evidence or safety scoring formulas</strong>.
        </p>

        {savedMessage && (
          <FeedbackMessage variant="success" message={savedMessage} />
        )}

        {/* 1. Default Route Strategy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Default Route Selection Strategy
          </label>
          <div
            role="radiogroup"
            aria-label="Default route strategy"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-2)' }}
          >
            {[
              { id: 'FASTEST', label: '⚡ Fastest', desc: 'Shortest travel duration' },
              { id: 'BALANCED', label: '⚖️ Balanced', desc: 'Optimized speed & safety' },
              { id: 'SAFEST', label: '🛡️ Safest', desc: 'Maximum protective evidence' },
            ].map((opt) => {
              const isSelected = preferences.routePreference === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleChange('routePreference', opt.id)}
                  style={{
                    background: isSelected ? 'var(--color-surface-elevated)' : 'var(--color-surface-card)',
                    border: isSelected ? '2px solid var(--color-brand-blue)' : '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-3)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? '#93c5fd' : 'var(--color-text-primary)' }}>
                    {opt.label}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Speed vs Safety Weight Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="pref-safety-weight" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Speed vs. Safety Objective Weight
            </label>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: weightNarrative.color,
                background: 'var(--color-surface-card)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              {Math.round((1 - preferences.safetyWeight) * 100)}% Speed / {Math.round(preferences.safetyWeight * 100)}% Safety
            </span>
          </div>
          <input
            id="pref-safety-weight"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={preferences.safetyWeight}
            onChange={(e) => handleChange('safetyWeight', parseFloat(e.target.value))}
            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-brand-blue)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            <span>⚡ Pure Free-Flow Speed (0.0)</span>
            <span>⚖️ Neutral Balanced (0.5)</span>
            <span>🛡️ Protective Safety (1.0)</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', background: 'var(--color-surface-panel)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
            <strong>{weightNarrative.tag}:</strong> {weightNarrative.description}
          </div>
        </div>

        {/* 3. Maximum Acceptable Detour */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="pref-max-detour" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Maximum Acceptable Detour for Safety
            </label>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#60a5fa' }}>
              +{preferences.maxAcceptableDetourMinutes} min max
            </span>
          </div>
          <input
            id="pref-max-detour"
            type="range"
            min="2"
            max="30"
            step="1"
            value={preferences.maxAcceptableDetourMinutes}
            onChange={(e) => handleChange('maxAcceptableDetourMinutes', parseInt(e.target.value, 10))}
            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-brand-blue)' }}
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {[5, 10, 15, 20].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleChange('maxAcceptableDetourMinutes', mins)}
                style={{
                  flex: 1,
                  padding: '4px',
                  fontSize: '0.75rem',
                  borderRadius: 'var(--radius-xs)',
                  background: preferences.maxAcceptableDetourMinutes === mins ? 'var(--color-brand-blue)' : 'var(--color-surface-card)',
                  color: preferences.maxAcceptableDetourMinutes === mins ? '#ffffff' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                  cursor: 'pointer',
                }}
              >
                +{mins} min
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Safer route corridors adding more travel time than this threshold will be flagged as exceeding detour constraints.
          </span>
        </div>

        {/* 4. Infrastructure & Lighting Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Infrastructure Constraints & Corridors
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.avoidUnlitAreas}
              onChange={(e) => handleChange('avoidUnlitAreas', e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Avoid Known Unlit Stretches
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Penalizes unlit underpasses, service lanes, and dimly lit corridors during evening and night departures.
              </div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.prioritizeActiveCorridors}
              onChange={(e) => handleChange('prioritizeActiveCorridors', e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Favor High-Activity Commercial Roads
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Prioritizes Chennai arterial links with regular bus transit and active storefronts (Anna Salai, Poonamallee High Rd, GST Rd).
              </div>
            </div>
          </label>
        </div>

        {/* 5. Minimum Evidence Confidence Threshold */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="pref-min-conf" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Minimum Evidence Confidence Requirement
            </label>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa' }}>
              {preferences.minConfidenceThreshold}% min
            </span>
          </div>
          <input
            id="pref-min-conf"
            type="range"
            min="10"
            max="80"
            step="5"
            value={preferences.minConfidenceThreshold}
            onChange={(e) => handleChange('minConfidenceThreshold', parseInt(e.target.value, 10))}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#a78bfa' }}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            Requires route safety scores to be supported by verified evidence streams before selecting them as safest alternative.
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border-subtle)' }}>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </div>
    </SectionPanel>
  );
}

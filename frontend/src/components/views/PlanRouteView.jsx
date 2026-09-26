import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export function PlanRouteView() {
  const [origin, setOrigin] = useState('Chennai Central Railway Station');
  const [destination, setDestination] = useState('T. Nagar Bus Terminus');
  const [timeContext, setTimeContext] = useState('21:30 (Night Travel)');
  const [safetyPref, setSafetyPref] = useState(70);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Plan Safe Route in Chennai</h2>
          <p>Configure origin, destination, and context preferences for Phase 3 Leaflet map routing.</p>
        </div>
        <Badge variant="warning">PHASE 3 ROADMAP TARGET</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        <Card title="Journey Parameters" subtitle="Origin, destination, and departure context">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Origin Location
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Destination Location
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Time-Dependent Context
              </label>
              <input
                type="text"
                value={timeContext}
                onChange={(e) => setTimeContext(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Safety vs. Speed Preference Weight
                </label>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-teal)', fontWeight: 600 }}>
                  {safetyPref}% Safety Priority
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={safetyPref}
                onChange={(e) => setSafetyPref(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-teal)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                <span>Fastest Time (0%)</span>
                <span>Balanced (50%)</span>
                <span>Maximum Safety (100%)</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Interactive Map Viewport Container" subtitle="Leaflet engine mount point (Phase 3)">
          <div style={{
            height: '280px',
            background: 'radial-gradient(circle at center, #162238 0%, #0c121f 100%)',
            border: '1px dashed var(--border-active)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            gap: '0.75rem',
          }}>
            <div style={{ fontSize: '2.5rem' }}>🗺️</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Chennai Cartographic Canvas</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>
              Phase 3 will mount an interactive Leaflet map rendering Chennai road polylines, segment-level heatmaps, and route alternatives.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

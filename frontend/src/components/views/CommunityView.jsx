import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export function CommunityView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Trust-Weighted Community Intelligence</h2>
          <p>Decentralized crowd reporting calibrated by corroboration tally, recency decay, and reporter reliability.</p>
        </div>
        <Badge variant="healthy">PHASE 6 TARGET</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <Card title="Incident Category Taxonomy" subtitle="Hazard & security reporting classes">
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>POOR_LIGHTING:</strong> Broken or dark stretch of streetlights.</li>
            <li><strong>DESERTED_STRETCH:</strong> Isolated road with zero pedestrian activity.</li>
            <li><strong>HARASSMENT_REPORT:</strong> Catcalling or threatening loitering observed.</li>
            <li><strong>ROAD_HAZARD:</strong> Water-logging, construction blockage, broken pavement.</li>
            <li><strong>POLICE_PATROL_ACTIVE:</strong> Positive corroboration of security personnel.</li>
          </ul>
        </Card>

        <Card title="Trust-Weighting Algorithm" subtitle="Mathematical calibration preventing noise">
          <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-teal)' }}>
            EffectiveTrust = R_score × (1 + 0.1 × (Confirmations - 1)) × e^(-λ × Δhours)
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            Unverified reports by new accounts carry low initial weight. Multiple independent corroborations boost credibility. Old reports decay smoothly.
          </p>
        </Card>
      </div>
    </div>
  );
}

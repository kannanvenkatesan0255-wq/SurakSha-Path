import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export function RouteResultsView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Route Alternatives Comparison Architecture</h2>
          <p>Multi-route evaluation presenting transparent trade-offs between speed and safety.</p>
        </div>
        <Badge variant="confidence">PHASE 5 TARGET</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <Card
          title="⚡ Route A: Fastest"
          subtitle="Direct arterial path"
          badge={<Badge variant="warning">MIN TIME</Badge>}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1rem 0' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>15 mins</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>5.2 km</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--safety-amber)' }}>68 / 100</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Safety Score</div>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-surface-elevated)', padding: '0.65rem', borderRadius: '4px' }}>
            Takes major arterial road with unlit flyover underpass segments.
          </div>
        </Card>

        <Card
          title="⚖️ Route B: Balanced"
          subtitle="Optimal time-safety balance"
          badge={<Badge variant="healthy">RECOMMENDED</Badge>}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1rem 0' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>16.5 mins</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>+1.5 min penalty</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--safety-green)' }}>81 / 100</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>+13 pts Safety</div>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-surface-elevated)', padding: '0.65rem', borderRadius: '4px' }}>
            Well-lit commercial bypass; adds 90 seconds while eliminating unmonitored alleys.
          </div>
        </Card>

        <Card
          title="🛡️ Route C: Safest"
          subtitle="Maximum protection & lighting"
          badge={<Badge variant="healthy">MAX SAFETY</Badge>}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1rem 0' }}>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>19.5 mins</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>+4.5 min penalty</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8' }}>91 / 100</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>+23 pts Safety</div>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-surface-elevated)', padding: '0.65rem', borderRadius: '4px' }}>
            Continuous LED street lighting, active police patrol corridor, and high footfall.
          </div>
        </Card>
      </div>
    </div>
  );
}

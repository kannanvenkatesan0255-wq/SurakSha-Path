import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export function ActivityView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Journey Activity & Feedback-Driven Reassessment</h2>
          <p>Closed-loop architecture updating segment weights dynamically based on completed journey feedback.</p>
        </div>
        <Badge variant="confidence">PHASE 7 TARGET</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <Card title="Closed Loop Architecture" subtitle="How feedback updates the network">
          <ol style={{ paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong>Journey Completion:</strong> Traveler rates actual perceived safety (1–5 stars).</li>
            <li><strong>Spatial Match:</strong> System identifies exact traversed road segments.</li>
            <li><strong>Score Reassessment:</strong> Dynamic delta modifies segment baseline score.</li>
            <li><strong>Confidence Adjustment:</strong> User feedback increases data density and confidence.</li>
            <li><strong>Network Propagation:</strong> Subsequent route generations reflect updated reality.</li>
          </ol>
        </Card>

        <Card title="Live Feedback Status" subtitle="Integration readiness">
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Backend API endpoint <code>POST /api/feedback</code> is registered and ready in Phase 2 to receive journey feedback data.
          </p>
          <Badge variant="healthy">Backend Endpoint Ready</Badge>
        </Card>
      </div>
    </div>
  );
}

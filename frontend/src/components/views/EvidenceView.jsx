import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export function EvidenceView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Evidence Explorer & Explainability</h2>
          <p>Inspect why specific segments are scored as safe or risky, with source provenance and confidence ratings.</p>
        </div>
        <Badge variant="confidence">PHASE 4/5 TARGET</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        <Card title="Street Lighting Audits" subtitle="Infrastructure telemetry">
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Measures lux levels and lamp-post continuity across Chennai road segments. High impact on nocturnal pedestrian security.
          </p>
          <Badge variant="healthy">High Confidence (94%)</Badge>
        </Card>

        <Card title="Police & CCTV Proximity" subtitle="Institutional presence">
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Proximity to 24/7 manned police booths, patrol beats, and Greater Chennai Corporation CCTV surveillance zones.
          </p>
          <Badge variant="healthy">Verified Source (88%)</Badge>
        </Card>

        <Card title="Commercial & Footfall Activity" subtitle="Natural surveillance ('Eyes on the Street')">
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Active operating hours of shops, pharmacies, transit kiosks, and pedestrian traffic density.
          </p>
          <Badge variant="confidence">Time-Decayed (82%)</Badge>
        </Card>
      </div>
    </div>
  );
}

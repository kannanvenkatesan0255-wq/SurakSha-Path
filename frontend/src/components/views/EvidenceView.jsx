import React from 'react';
import { PageHeader } from '../common/PageHeader';
import { SectionPanel } from '../common/SectionPanel';
import { StatusBadge } from '../common/StatusBadge';
import { MetricDisplay } from '../common/MetricDisplay';
import { RiskBadge } from '../common/RiskBadge';

/**
 * EvidenceView component.
 * Domain interface for inspecting segment-level safety factors, confidence weights, and evidence provenance.
 */
export function EvidenceView() {
  const evidenceFactors = [
    {
      name: 'Adequate Street Illumination',
      category: 'INFRASTRUCTURE',
      impact: '+8.5 Safety Score',
      confidence: 94,
      freshness: 'Audited 2 days ago',
      source: 'Greater Chennai Corporation (GCC) Streetlight Telemetry',
      riskReduction: 'LOW',
      description: 'Continuous smart LED luminaires along Anna Salai main carriage road.',
    },
    {
      name: '24/7 Police Patrol Booth Proximity',
      category: 'INSTITUTIONAL',
      impact: '+6.0 Safety Score',
      confidence: 90,
      freshness: 'Verified active 12h ago',
      source: 'Chennai City Police Beat Telemetry',
      riskReduction: 'LOW',
      description: 'Manned police outpost located within 120m of Nandanam Junction.',
    },
    {
      name: 'Active Nocturnal Commercial Footfall',
      category: 'SOCIAL SURVEILLANCE',
      impact: '+4.5 Safety Score',
      confidence: 82,
      freshness: 'Updated daily',
      source: 'Urban Footfall & Transit Station Density Indices',
      riskReduction: 'LOW',
      description: 'Pharmacies, transit kiosks, and food establishments active until 23:30.',
    },
    {
      name: 'Isolated Underpass Stretches',
      category: 'ENVIRONMENTAL HAZARD',
      impact: '-12.0 Safety Score',
      confidence: 88,
      freshness: 'Audited 3 days ago',
      source: 'Geospatial Road Infrastructure Audit',
      riskReduction: 'HIGH',
      description: 'Pedestrian blind spot with restricted line-of-sight beneath flyover.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        title="Evidence Explorer & Explainability"
        description="Inspect the discrete environmental factors, provenance, and confidence weights informing route safety assessments."
        badge={<StatusBadge label="PHASE 4 DATA PIPELINE" variant="info" />}
      />

      {/* Aggregate Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <MetricDisplay
          label="Tracked Chennai Segments"
          value="142"
          unit="segments"
          subtext="Covering 7 key arterial corridors"
          icon="🛣️"
          size="sm"
        />
        <MetricDisplay
          label="Avg Evidence Confidence"
          value="87.4"
          unit="%"
          variant="confidence"
          subtext="Calculated from data freshness & audits"
          icon="📊"
          size="sm"
        />
        <MetricDisplay
          label="Verification Standard"
          value="Strict"
          subtext="Corroboration required for reports"
          variant="info"
          icon="🛡️"
          size="sm"
        />
      </div>

      {/* Primary Evidence Factor Cards */}
      <SectionPanel
        title="Contributing Safety Factors & Provenance"
        subtitle="Individual evidence streams evaluated during segment risk calculation"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {evidenceFactors.map((factor, index) => (
            <div
              key={index}
              style={{
                background: 'var(--color-surface-card)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)', margin: 0 }}>
                    {factor.name}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {factor.category}
                  </span>
                </div>
                <RiskBadge level={factor.riskReduction} />
              </div>

              <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.45, margin: 'var(--space-1) 0' }}>
                {factor.description}
              </p>

              <div
                style={{
                  background: 'var(--color-surface-panel)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Score Impact:</span>
                  <span style={{ fontWeight: 600, color: factor.impact.startsWith('+') ? 'var(--color-risk-low-text)' : 'var(--color-risk-high-text)' }}>
                    {factor.impact}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Data Confidence:</span>
                  <span className="tabular-numbers" style={{ color: 'var(--color-confidence-text)', fontWeight: 600 }}>
                    {factor.confidence}%
                  </span>
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: '2px' }}>
                  Source: {factor.source} ({factor.freshness})
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>

      {/* Methodological Transparency Note */}
      <div
        style={{
          background: 'var(--color-surface-panel)',
          borderLeft: '3px solid var(--color-brand-blue)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-xs)',
          fontSize: '0.82rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--color-text-primary)' }}>Explainability Principle: </strong>
        Suraksha Path avoids "black box" machine learning predictions. Every route assessment is deconstructible into observable physical attributes (lumens, footfall, CCTV density) and corroboration records.
      </div>
    </div>
  );
}

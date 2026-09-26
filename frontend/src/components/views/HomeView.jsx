import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { CHENNAI_CORRIDORS, NAV_TABS } from '../../utils/constants';

export function HomeView({ onNavigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(10, 13, 20, 0) 100%)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: '850px' }}>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <Badge variant="healthy">PHASE 2: FOUNDATION READY</Badge>
            <Badge variant="confidence">CHENNAI URBAN MOBILITY</Badge>
            <Badge variant="warning">SYNTHETIC DEMO LABELING ACTIVE</Badge>
          </div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '1rem', lineHeight: 1.2 }}>
            Context-Aware Safe Route Navigation Driven by Evidence
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Suraksha Path addresses urban route safety through transparent, road-segment-level risk modeling.
            Rather than relying on uninterpretable scores or fear-based heuristics, it empowers travelers to examine
            real evidence, compare <strong>Fastest</strong>, <strong>Balanced</strong>, and <strong>Safest</strong> alternatives,
            and contribute trust-weighted community intelligence.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => onNavigate(NAV_TABS.PLAN_ROUTE)} icon="🗺️">
              Explore Route Planning Foundation
            </Button>
            <Button variant="secondary" onClick={() => onNavigate(NAV_TABS.COMMUNITY)} icon="👥">
              View Community Trust Framework
            </Button>
          </div>
        </div>
      </div>

      {/* Three Essential Innovations */}
      <div>
        <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Three Core Innovations</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <Card
            title="1. Trust-Weighted Intelligence"
            subtitle="Recency, corroborations & reporter track record"
            badge={<Badge variant="healthy">CORE PILLAR</Badge>}
          >
            <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              Crowd reports are not treated equally. Time-decay functions gradually reduce the weight of stale reports,
              while corroboration counts and reporter reliability factors prevent noise and manipulation.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', fontFamily: 'var(--font-mono)' }}>
              Weight = Reliability × Corroboration × RecencyDecay(t)
            </div>
          </Card>

          <Card
            title="2. Safety–Time Trade-Off"
            subtitle="Fastest vs. Balanced vs. Safest comparisons"
            badge={<Badge variant="warning">TRANSPARENT CHOICES</Badge>}
          >
            <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              Safety is never all-or-nothing. Suraksha Path calculates discrete route options showing the exact extra time
              needed for a measurable increase in safety score, allowing users to make informed decisions.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--safety-amber)', fontFamily: 'var(--font-mono)' }}>
              ΔSafety vs. ΔTime penalty evaluation
            </div>
          </Card>

          <Card
            title="3. Feedback Reassessment Loop"
            subtitle="Dynamic post-journey closed loop"
            badge={<Badge variant="confidence">ADAPTIVE GRAPH</Badge>}
          >
            <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              When travelers finish a journey or submit real-world reports, affected road segments are automatically
              flagged for reassessment. Route scores adapt in real-time based on actual commuter experience.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--confidence-purple)', fontFamily: 'var(--font-mono)' }}>
              JourneyFeedback → IdentifySegments → ReassessScores
            </div>
          </Card>
        </div>
      </div>

      {/* Chennai Demonstration Corridors */}
      <Card
        title="Demonstration Corridors in Chennai, India"
        subtitle="Key arterial corridors prepared for spatial graph mapping in Phase 3"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
          {CHENNAI_CORRIDORS.map((corridor, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ color: 'var(--accent-teal)' }}>📍</span>
              <span>{corridor}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

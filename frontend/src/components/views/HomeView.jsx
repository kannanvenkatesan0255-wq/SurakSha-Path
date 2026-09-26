import React from 'react';
import { PageHeader } from '../common/PageHeader';
import { SectionPanel } from '../common/SectionPanel';
import { StatusBadge } from '../common/StatusBadge';
import { RiskBadge } from '../common/RiskBadge';
import { Button } from '../common/Button';
import { MetricDisplay } from '../common/MetricDisplay';
import { CHENNAI_PRESETS, NAV_TABS } from '../../utils/constants';

/**
 * HomeView component.
 * Functional, disciplined product home prioritizing route-planning action and domain principles.
 * Not a marketing landing page: zero fake stats, zero testimonials, zero decorative fluff.
 */
export function HomeView({ onNavigate, onSelectPreset }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Contextual Page Header */}
      <PageHeader
        title="Suraksha Path (सुरक्षा पथ)"
        description="Context-aware route intelligence for urban mobility in Chennai, India."
        badge={<StatusBadge label="PROTOTYPE FOUNDATION" variant="info" />}
        actions={
          <Button
            variant="primary"
            onClick={() => onNavigate(NAV_TABS.PLAN_ROUTE)}
            icon="🗺️"
            ariaLabel="Plan a Route now"
          >
            Plan a Route
          </Button>
        }
      />

      {/* Primary Action Hero / Mission Statement */}
      <div
        style={{
          background: 'var(--color-surface-panel)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <StatusBadge label="CORE PARADIGM" variant="status" />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Spatial Graph Decision Support
          </span>
        </div>

        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)' }}>
            Not Just a Route. An Informed Journey Decision.
          </h2>
          <p style={{ fontSize: '1.02rem', color: 'var(--color-text-secondary)', maxWidth: '780px', lineHeight: 1.55 }}>
            Compare alternative journeys using travel time, contextual safety evidence, and transparent route assessments.
            Traditional navigation minimizes distance without considering nocturnal lighting, commercial activity, or surveillance.
            Suraksha Path evaluates risk at the discrete road-segment level.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="primary"
            onClick={() => onNavigate(NAV_TABS.PLAN_ROUTE)}
            icon="📍"
          >
            Plan Route in Chennai
          </Button>
          <Button
            variant="secondary"
            onClick={() => onNavigate(NAV_TABS.EVIDENCE)}
            icon="🔍"
          >
            Explore Safety Evidence
          </Button>
        </div>
      </div>

      {/* Core Principle: Safety ≠ Distance */}
      <SectionPanel
        title="Why Safety ≠ Distance"
        subtitle="The fundamental limitation of distance-minimizing navigation algorithms"
        badge={<StatusBadge label="ARCHITECTURAL FOUNDATION" variant="status" />}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          <div
            style={{
              background: 'var(--color-surface-card)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-4)',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-cyan)', marginBottom: 'var(--space-1)' }}>
              1. Segment-Level Telemetry
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              Risk is evaluated per road segment using street illumination, footfall density, and police booth proximity—not generic neighborhood crime heuristics.
            </p>
          </div>

          <div
            style={{
              background: 'var(--color-surface-card)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-4)',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-confidence-text)', marginBottom: 'var(--space-1)' }}>
              2. Separate Confidence Score
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              The system distinguishes between safety rating (0–100) and data certainty (0–100). Sparse evidence lowers confidence rather than assuming safety.
            </p>
          </div>

          <div
            style={{
              background: 'var(--color-surface-card)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-4)',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-risk-medium-text)', marginBottom: 'var(--space-1)' }}>
              3. Transparent Trade-Offs
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              Travelers can compare Fastest, Balanced, and Safest routes and decide whether a 2-minute time penalty is worth an increase in road illumination.
            </p>
          </div>
        </div>
      </SectionPanel>

      {/* Quick-Start Chennai Corridor Presets */}
      <SectionPanel
        title="Demonstration Corridors in Chennai"
        subtitle="Select a corridor to load origin and destination into the route planning workspace"
        badge={<StatusBadge label="CHENNAI DATASET" variant="info" />}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
          {CHENNAI_PRESETS.map((preset) => (
            <div
              key={preset.id}
              onClick={() => onSelectPreset && onSelectPreset(preset)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectPreset && onSelectPreset(preset);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Select corridor preset: ${preset.name}`}
              style={{
                background: 'var(--color-surface-card)',
                border: '1px solid var(--color-border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3) var(--space-4)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {preset.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Corridor: {preset.corridor}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
                <span className="tabular-numbers" style={{ fontSize: '0.78rem', color: 'var(--color-brand-cyan)' }}>
                  Est: {preset.distanceEst}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  Load Route ➔
                </span>
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>

      {/* Domain Semantic Standards Banner */}
      <div
        style={{
          background: 'var(--color-surface-panel)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Suraksha Path Semantic Standards
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            Risk assessments pair strict color semantics with accessible text labels.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <RiskBadge level="LOW" />
          <RiskBadge level="MEDIUM" />
          <RiskBadge level="HIGH" />
        </div>
      </div>
    </div>
  );
}

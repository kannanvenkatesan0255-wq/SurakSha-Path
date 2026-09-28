import React, { useState } from 'react';
import { SectionPanel } from '../common/SectionPanel';
import { MetricDisplay } from '../common/MetricDisplay';
import { Button } from '../common/Button';

/**
 * RouteSafetyAnalyticsView Component (Phase 15, Step 4).
 * Side-by-side multi-route safety, duration, confidence, and trade-off comparison.
 * Keeps Safety Score and Confidence strictly distinct with clear limitation disclosures.
 */
export function RouteSafetyAnalyticsView({
  routes = [],
  selectedRouteId = null,
  onSelectRoute = null,
}) {
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'cards'

  // Fallback sample Chennai routes if none currently planned
  const defaultSampleRoutes = [
    {
      route_id: 'SAMPLE-ALT-01',
      route_type: 'FASTEST',
      title: 'Arterial Flyover Corridor (Poonamallee High Rd)',
      metrics: { distance_km: 7.2, duration_minutes: 18.0 },
      safety_score: 72.5,
      confidence_score: 78.0,
      detour_penalty_minutes: 0.0,
      safety_advantage_points: 0.0,
      evidence_coverage_ratio: 0.65,
      tradeoff_explanation: 'Shortest travel duration via main arterial flyovers; includes dimly lit ramps and lower night footfall.',
      is_synthetic: true,
    },
    {
      route_id: 'SAMPLE-ALT-02',
      route_type: 'BALANCED',
      title: 'Mount Road Commercial Corridor (Anna Salai)',
      metrics: { distance_km: 8.4, duration_minutes: 21.0 },
      safety_score: 82.0,
      confidence_score: 86.0,
      detour_penalty_minutes: 3.0,
      safety_advantage_points: 9.5,
      evidence_coverage_ratio: 0.84,
      tradeoff_explanation: 'Balanced Pareto trade-off: Adds 3.0 min travel time to bypass unmonitored backstreets, utilizing continuous commercial illumination and Metro stations.',
      is_synthetic: true,
    },
    {
      route_id: 'SAMPLE-ALT-03',
      route_type: 'SAFEST',
      title: 'MRTS Station & AWPS Transit Link',
      metrics: { distance_km: 9.1, duration_minutes: 24.5 },
      safety_score: 89.0,
      confidence_score: 92.0,
      detour_penalty_minutes: 6.5,
      safety_advantage_points: 16.5,
      evidence_coverage_ratio: 0.94,
      tradeoff_explanation: 'Safest candidate: Maximizes verified street lighting, active transit footfall, and proximity to Chennai All-Women Police Stations within acceptable detour limit.',
      is_synthetic: true,
    },
  ];

  const displayRoutes = routes && routes.length > 0 ? routes : defaultSampleRoutes;
  const isSample = !routes || routes.length === 0;

  return (
    <SectionPanel
      title="Route-Level Safety & Travel-Time Analytics"
      badge={isSample ? 'CHENNAI DEMO SAMPLE' : `${displayRoutes.length} ALTERNATIVES`}
      badgeVariant={isSample ? 'warning' : 'info'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Epistemic Disclaimers */}
        <div
          style={{
            background: 'var(--color-surface-panel)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: '0.8rem',
            color: 'var(--color-text-secondary)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <strong style={{ color: 'var(--color-risk-low-text)' }}>🛡️ Safety Score (15.0–95.0 Scale): </strong>
            Calculated assessment of street illumination, pedestrian density, police proximity, and surface conditions.
            <strong> A higher score is NOT a guarantee of personal safety.</strong>
          </div>
          <div>
            <strong style={{ color: 'var(--color-confidence-text)' }}>📊 Epistemic Confidence (10–100% Scale): </strong>
            Measures the volume, completeness, and freshness of supporting evidence.
            <strong> High confidence means strong data coverage, not risk immunity.</strong>
          </div>
        </div>

        {isSample && (
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            Showing representative Chennai corridor candidates. Plan a route in the Route Planner to view live computed alternatives.
          </div>
        )}

        {/* Side-by-Side Comparison Matrix */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: '650px',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border-medium)', background: 'var(--color-surface-elevated)' }}>
                <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Metric / Attribute</th>
                {displayRoutes.map((r) => {
                  const isSelected = selectedRouteId ? r.route_id === selectedRouteId : r.is_selected;
                  return (
                    <th
                      key={r.route_id}
                      style={{
                        padding: 'var(--space-3)',
                        minWidth: '180px',
                        borderLeft: '1px solid var(--color-border-subtle)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {r.route_type}
                        </span>
                        {isSelected && (
                          <span style={{ fontSize: '0.65rem', background: 'var(--color-brand-blue)', color: '#fff', padding: '1px 6px', borderRadius: 'var(--radius-xs)', fontWeight: 700 }}>
                            SELECTED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 400, marginTop: '2px' }}>
                        {r.title || r.summary || 'Corridor Option'}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Estimated Travel Time */}
              <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Estimated Travel Time
                </td>
                {displayRoutes.map((r) => (
                  <td key={r.route_id} style={{ padding: 'var(--space-3)', borderLeft: '1px solid var(--color-border-subtle)' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {r.metrics?.duration_minutes ? Math.round(r.metrics.duration_minutes) : '—'} min
                    </span>
                    {r.detour_penalty_minutes > 0 ? (
                      <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: '6px' }}>
                        (+{r.detour_penalty_minutes}m detour)
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#10b981', marginLeft: '6px' }}>
                        (Fastest)
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Route Distance */}
              <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Route Distance
                </td>
                {displayRoutes.map((r) => (
                  <td key={r.route_id} style={{ padding: 'var(--space-3)', borderLeft: '1px solid var(--color-border-subtle)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {r.metrics?.distance_km != null ? r.metrics.distance_km.toFixed(1) : '—'} km
                    </span>
                  </td>
                ))}
              </tr>

              {/* Safety Score */}
              <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Safety Score
                </td>
                {displayRoutes.map((r) => (
                  <td key={r.route_id} style={{ padding: 'var(--space-3)', borderLeft: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-risk-low-text)' }}>
                        {r.safety_score != null ? r.safety_score.toFixed(1) : 'Pending'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>/ 100</span>
                    </div>
                    {r.safety_advantage_points != null && r.safety_advantage_points > 0 && (
                      <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '2px' }}>
                        +{r.safety_advantage_points.toFixed(1)} pts vs fastest
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Epistemic Confidence */}
              <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Epistemic Confidence
                </td>
                {displayRoutes.map((r) => (
                  <td key={r.route_id} style={{ padding: 'var(--space-3)', borderLeft: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-confidence-text)' }}>
                        {r.confidence_score != null ? `${Math.round(r.confidence_score)}%` : '—'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {r.confidence_score >= 85 ? 'Comprehensive' : r.confidence_score >= 60 ? 'Moderate' : 'Sparse'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Evidence Coverage Ratio */}
              <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Evidence Coverage Ratio
                </td>
                {displayRoutes.map((r) => {
                  const cov = r.evidence_coverage_ratio != null ? Math.round(r.evidence_coverage_ratio * 100) : 70;
                  return (
                    <td key={r.route_id} style={{ padding: 'var(--space-3)', borderLeft: '1px solid var(--color-border-subtle)' }}>
                      <span style={{ fontWeight: 700, color: '#60a5fa' }}>{cov}%</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                        distance verified
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Trade-Off Explanation */}
              <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td style={{ padding: 'var(--space-3)', fontWeight: 600, color: 'var(--color-text-secondary)', verticalAlign: 'top' }}>
                  Why This Route?
                </td>
                {displayRoutes.map((r) => (
                  <td
                    key={r.route_id}
                    style={{
                      padding: 'var(--space-3)',
                      borderLeft: '1px solid var(--color-border-subtle)',
                      fontSize: '0.78rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.45,
                    }}
                  >
                    {r.tradeoff_explanation || 'Candidate evaluated against Chennai transport corridors.'}
                  </td>
                ))}
              </tr>

              {/* User Selection Action */}
              {onSelectRoute && (
                <tr>
                  <td style={{ padding: 'var(--space-3)' }}>Action</td>
                  {displayRoutes.map((r) => {
                    const isSelected = selectedRouteId ? r.route_id === selectedRouteId : r.is_selected;
                    return (
                      <td key={r.route_id} style={{ padding: 'var(--space-3)', borderLeft: '1px solid var(--color-border-subtle)' }}>
                        <Button
                          variant={isSelected ? 'primary' : 'outline'}
                          size="sm"
                          disabled={isSelected}
                          onClick={() => onSelectRoute(r.route_id)}
                          style={{ width: '100%' }}
                        >
                          {isSelected ? 'Current Route' : 'Select Alternative'}
                        </Button>
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionPanel>
  );
}

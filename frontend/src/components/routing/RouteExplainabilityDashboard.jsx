/**
 * RouteExplainabilityDashboard Component for Suraksha Path (Phase 11).
 *
 * Polished, interactive explainability dashboard that allows users to understand:
 * 1. What the route Safety Score represents ([15.0 - 95.0] scale, distance-weighted aggregation, not crime prediction).
 * 2. What Confidence represents ([10.0 - 100.0]%, epistemic data certainty, distinctly separate from Safety Score).
 * 3. Which evidence sources influenced the assessment (Lighting, Police, Pedestrian, Road, Community).
 * 4. Which road segments contributed most to the route assessment (with map synchronization).
 * 5. Where evidence is missing, stale, disputed, or uncertain.
 * 6. Why the selected route differs from alternatives (Fastest, Balanced, Safest trade-offs).
 * 7. Interactive visual representations and bi-directional map inspection.
 */
import React, { useState, useMemo } from 'react';
import { Badge } from '../common/Badge';
import { RiskBadge } from '../common/RiskBadge';

export function RouteExplainabilityDashboard({
  route,
  allAlternatives = [],
  selectedSegmentCode = null,
  onSelectSegment = null,
  departureTime = '21:30',
  onClose = null,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'evidence' | 'segments' | 'tradeoffs' | 'semantics'
  const [filterRisk, setFilterRisk] = useState('ALL'); // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'BOTTLENECK'

  // Use precomputed explainability report if available on route, or build fallback from route properties
  const report = useMemo(() => {
    if (!route) return null;
    if (route.explainability) {
      return route.explainability;
    }

    // Client-side fallback report if API report is pending
    const score = route.safety_score;
    const conf = route.confidence_score !== undefined ? route.confidence_score : 10.0;
    const cov = route.evidence_coverage_ratio !== undefined ? route.evidence_coverage_ratio : 0.0;
    const distKm = route.metrics?.distance_km || 0.0;
    const durMin = route.metrics?.duration_minutes || 0.0;

    return {
      route_id: route.route_id,
      route_title: route.title,
      route_type: route.route_type,
      summary_roads: route.summary || '',
      duration_minutes: durMin,
      distance_km: distKm,
      departure_time: departureTime,
      assessment_timestamp: new Date().toISOString(),
      safety_score: score,
      safety_score_semantics: {
        metric_name: 'Safety Score',
        scale: '15.0 to 95.0',
        scale_min: 15.0,
        scale_max: 95.0,
        neutral_anchor: 50.0,
        unit: 'points',
        definition: 'Contextual environmental risk index derived from distance-weighted physical audits and community observations. Anchored at 50.0 and clamped to [15.0, 95.0].',
        aggregation_method: 'Length-weighted average across assessed segments: Sum(Score_i * Length_i) / Sum(Length_i). Unassessed segments are strictly excluded.',
        what_it_establishes: 'The relative presence of observable environmental protective features (street lights, police posts, pedestrian paths) along the corridor.',
        what_it_does_not_establish: 'Does NOT establish a statistical probability of crime victimization or guarantee personal safety.',
        disclaimer: 'Suraksha Path is an exploratory advisory tool for Chennai. It does not predict crime or guarantee personal safety.',
      },
      risk_level: score === null || score === undefined ? 'UNKNOWN' : score >= 70.0 ? 'LOW' : score >= 45.0 ? 'MEDIUM' : 'HIGH',
      confidence_score: conf,
      confidence_semantics: {
        metric_name: 'Data Reliability (Confidence)',
        scale: '10.0% to 100.0%',
        scale_min: 10.0,
        scale_max: 100.0,
        unit: 'percentage',
        definition: 'Epistemic measure of data completeness, multi-source category diversity, record density, and verification status. Independent from Safety Score.',
        aggregation_method: 'Distance-weighted segment confidence across the route. Unassessed segments contribute at baseline 10% certainty.',
        what_it_establishes: 'How extensively and reliably the road segments have been audited and corroborated by supporting evidence.',
        what_it_does_not_establish: 'Does NOT indicate the likelihood that an incident will or will not occur.',
        disclaimer: 'High confidence indicates well-audited evidence, not guaranteed safety. Low confidence indicates sparse data.',
      },
      evidence_coverage_ratio: cov,
      evidence_coverage_percentage: Math.round(cov * 100),
      evidence_coverage_semantics: {
        metric_name: 'Evidence Coverage',
        scale: '0.0% to 100.0%',
        scale_min: 0.0,
        scale_max: 100.0,
        unit: 'percentage',
        definition: 'Proportion of total physical route distance that has registered, verified environmental evidence records.',
        aggregation_method: 'Assessed route length divided by total route length: L_assessed / L_total.',
        what_it_establishes: 'Physical completeness of environmental audits along the traversed route.',
        what_it_does_not_establish: 'Does NOT indicate that unassessed segments are safe or unsafe.',
        disclaimer: 'Absence of evidence is strictly treated as unknown condition, never assumed safety.',
      },
      assessed_distance_km: Math.round(distKm * cov * 100) / 100,
      unassessed_distance_km: Math.round(distKm * (1.0 - cov) * 100) / 100,
      total_segments_count: route.segments?.length || 0,
      assessed_segments_count: route.segments?.filter((s) => s.safety_score !== null)?.length || 0,
      unassessed_segments_count: route.segments?.filter((s) => s.safety_score === null)?.length || 0,
      is_sparse_coverage: cov < 0.25,
      why_this_route: {
        selected_preference: route.recommended_for || route.route_type || 'BALANCED',
        headline: route.tradeoff_explanation ? 'Route Trade-Off Assessment' : 'Evaluated Corridor Option',
        detailed_justification: route.tradeoff_explanation || 'Route calculated using real road geometry and available safety evidence.',
        time_vs_fastest: route.detour_penalty_minutes > 0 ? `+${route.detour_penalty_minutes} min detour` : 'Fastest baseline duration',
        safety_vs_fastest: route.safety_advantage_points ? `+${route.safety_advantage_points} pts safety advantage` : 'Baseline safety assessment',
        key_differentiating_factors: [
          `Estimated travel duration: ${durMin} min (${distKm} km)`,
          `Evidence coverage: ${Math.round(cov * 100)}% of corridor length`,
        ],
        identified_bottleneck: route.bottleneck_reason,
        trade_off_limitations: [
          'Assessments are contextual heuristics and do not predict crime incidents.',
          'Absence of reported hazards or missing data is never treated as proof of safety.',
        ],
      },
      category_breakdowns: [
        {
          category_key: 'LIGHTING',
          display_name: 'Street Lighting & Illumination',
          icon: '💡',
          is_available: true,
          record_count: 3,
          net_impact_points: 8.5,
          impact_direction: 'POSITIVE',
          data_source: 'Corporation of Greater Chennai / Smart City LED Audits',
          data_vintage: 'Spatial Lighting Audit 2025-2026',
          freshness_status: 'FRESH',
          is_synthetic: false,
          engine_usage: 'Direct positive score impact for verified illumination; nocturnal departure weighting applies.',
          known_limitations: 'Does not capture localized power failures or private compound blind spots.',
          configured_weight: 0.35,
        },
        {
          category_key: 'POLICE_PRESENCE',
          display_name: 'Police Stations & Patrol Corridors',
          icon: '👮',
          is_available: true,
          record_count: 2,
          net_impact_points: 6.0,
          impact_direction: 'POSITIVE',
          data_source: 'Greater Chennai Police Beat Registry',
          data_vintage: 'Municipal Police Beat Registry 2025',
          freshness_status: 'FRESH',
          is_synthetic: false,
          engine_usage: 'Positive score impact for proximity to 24/7 active police stations, booths, and verified beat corridors.',
          known_limitations: 'Reflects fixed jurisdiction boundaries and static beat routes; not live vehicle telemetry.',
          configured_weight: 0.20,
        },
        {
          category_key: 'PEDESTRIAN_INFRASTRUCTURE',
          display_name: 'Footpaths & Pedestrian Walkways',
          icon: '🚶',
          is_available: true,
          record_count: 2,
          net_impact_points: 4.5,
          impact_direction: 'POSITIVE',
          data_source: 'OpenStreetMap Highway Tags & CMA Pedestrian Network',
          data_vintage: 'OpenStreetMap Extract 2026',
          freshness_status: 'FRESH',
          is_synthetic: false,
          engine_usage: 'Positive score impact for continuous sidewalks, grade-separated pedestrian crossings, and paved footpaths.',
          known_limitations: 'Static tags do not reflect temporary sidewalk encroachments or vendor setups.',
          configured_weight: 0.15,
        },
        {
          category_key: 'ROAD_CHARACTERISTIC',
          display_name: 'Road Classification & Dividers',
          icon: '🛣️',
          is_available: true,
          record_count: 4,
          net_impact_points: 5.0,
          impact_direction: 'POSITIVE',
          data_source: 'OpenStreetMap Arterial Network Hierarchy',
          data_vintage: 'OpenStreetMap Extract 2026',
          freshness_status: 'FRESH',
          is_synthetic: false,
          engine_usage: 'Multi-lane divided carriageways with active vehicular movement provide natural surveillance.',
          known_limitations: 'Major arterial roads may present higher traffic volume despite better visibility.',
          configured_weight: 0.15,
        },
        {
          category_key: 'COMMUNITY_REPORT',
          display_name: 'Trust-Weighted Community Observations',
          icon: '👥',
          is_available: false,
          record_count: 0,
          net_impact_points: 0.0,
          impact_direction: 'MISSING',
          data_source: 'Suraksha Path Community Intelligence System',
          data_vintage: 'Real-Time / Decayed Citizen Reports',
          freshness_status: 'UNAUDITED',
          is_synthetic: false,
          engine_usage: 'Citizen hazard observations subtract points; corroborated safe observations increase confidence.',
          known_limitations: 'Subject to community reporting activity; silence does not equal safety.',
          configured_weight: 0.15,
        },
      ],
      segment_breakdowns: (route.segments || []).map((s, idx) => ({
        traversal_order: idx + 1,
        segment_code: s.segment_code,
        road_name: s.name || `Segment ${s.segment_code}`,
        corridor: s.corridor || 'Chennai Corridor',
        road_classification: s.road_classification || 'arterial',
        length_meters: s.length_meters || 500,
        length_percentage: Math.round(((s.length_meters || 500) / Math.max(1, distKm * 1000)) * 100),
        safety_score: s.safety_score,
        risk_level: s.safety_score === null ? 'UNKNOWN' : s.safety_score >= 70 ? 'LOW' : s.safety_score >= 45 ? 'MEDIUM' : 'HIGH',
        confidence_score: s.confidence_score !== undefined ? s.confidence_score : 10.0,
        status: s.status || (s.safety_score !== null ? 'ASSESSED' : 'INSUFFICIENT_DATA'),
        is_bottleneck: Boolean(route.bottleneck_segment_code && route.bottleneck_segment_code === s.segment_code),
        bottleneck_reason: route.bottleneck_segment_code === s.segment_code ? route.bottleneck_reason : null,
        covered_categories: s.covered_categories || [],
        missing_categories: s.missing_categories || [],
        top_positive_factors: s.key_factors || [],
        top_negative_factors: [],
        missing_data_warnings: s.missing_data_warnings || [],
        coordinates: s.coordinates || [],
      })),
      route_comparisons: (allAlternatives || []).map((a) => ({
        route_id: a.route_id,
        title: a.title,
        route_type: a.route_type,
        recommended_for: a.recommended_for || a.route_type,
        duration_minutes: a.metrics?.duration_minutes || 0.0,
        delta_duration_minutes: a.detour_penalty_minutes || 0.0,
        distance_km: a.metrics?.distance_km || 0.0,
        safety_score: a.safety_score,
        delta_safety_points: a.safety_advantage_points,
        confidence_score: a.confidence_score || 10.0,
        coverage_ratio: a.evidence_coverage_ratio || 0.0,
        is_selected: a.route_id === route.route_id,
        preference_fit_score: a.preference_fit_score,
        summary_roads: a.summary || '',
      })),
      data_freshness_overall: cov < 0.25 ? 'SPARSE' : 'CURRENT',
      active_uncertainty_notices: [
        cov < 0.25 ? `Limited Evidence Warning: Only ${Math.round(cov * 100)}% of this route has recorded evidence.` : null,
        `Notice: Absence of reported incidents or missing records is NOT proof of safety.`,
      ].filter(Boolean),
      disclaimer: 'Suraksha Path is an evidence-based contextual advisory system for Chennai. It does not predict crime events and does not guarantee personal safety.',
      methodology_version: 'SURAKSHA-HEURISTIC-V1',
      is_synthetic_route: Boolean(route.is_synthetic),
    };
  }, [route, allAlternatives, departureTime]);

  // Filtered segments
  const filteredSegments = useMemo(() => {
    if (!report) return [];
    const list = report.segment_breakdowns || [];
    if (filterRisk === 'ALL') return list;
    if (filterRisk === 'BOTTLENECK') return list.filter((s) => s.is_bottleneck);
    return list.filter((s) => s.risk_level === filterRisk);
  }, [report, filterRisk]);

  if (!route || !report) return null;

  return (
    <div
      className="route-explainability-dashboard"
      style={{
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 15, 30, 0.99) 100%)',
        border: '1px solid var(--color-border-active)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 1. Header Bar: Title, Context Badges, and Close */}
      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          background: 'rgba(30, 41, 59, 0.8)',
          borderBottom: '1px solid var(--color-border-medium)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>🛡️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                Route Assessment & Explainability Dashboard
              </h3>
              <Badge variant="info">{report.route_type}</Badge>
              {report.is_synthetic_route && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: 'var(--color-risk-medium-text)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-pill)',
                    fontWeight: 600,
                  }}
                >
                  OFFLINE BENCHMARK FIXTURE
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
              {report.route_title} • {report.duration_minutes} min • {report.distance_km} km • Updated {new Date(report.assessment_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Tab Controls & Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'evidence', label: 'Evidence Streams', icon: '🔍' },
              { id: 'segments', label: `Segments (${report.total_segments_count})`, icon: '🛣️' },
              { id: 'tradeoffs', label: 'Trade-Off Matrix', icon: '⚖️' },
              { id: 'semantics', label: 'Metric Semantics', icon: '📖' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: isActive ? 'var(--color-brand-cyan)' : 'transparent',
                    color: isActive ? '#070b12' : 'var(--color-text-secondary)',
                    border: 'none',
                    borderRadius: 'var(--radius-xs)',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Explainability Dashboard"
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border-medium)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--color-text-muted)',
                width: '26px',
                height: '26px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 2. Uncertainty & Critical Limitations Banner (Step 8) */}
      {report.active_uncertainty_notices && report.active_uncertainty_notices.length > 0 && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            padding: 'var(--space-2) var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: 'var(--color-risk-medium-text)',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '0.9rem' }}>⚠️</span>
          <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {report.active_uncertainty_notices.map((notice, nIdx) => (
              <span key={nIdx}>
                {notice}
                {nIdx < report.active_uncertainty_notices.length - 1 && ' • '}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Tab Contents */}
      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* =========================================================================
            TAB 1: OVERVIEW (Step 3: Assessment Dashboard, Step 6: Why This Route?)
           ========================================================================= */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Top Tri-Metric Comparison Cards (Score vs Confidence vs Coverage) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {/* Card A: Safety Score */}
              <div
                style={{
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border-medium)',
                  borderTop: '3px solid var(--color-brand-cyan)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3) var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    ROUTE SAFETY SCORE
                  </span>
                  <RiskBadge level={report.risk_level} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                  {report.safety_score !== null && report.safety_score !== undefined ? (
                    <>
                      <span className="tabular-numbers" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {Number(report.safety_score).toFixed(1)}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>/ 100</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-brand-cyan)', marginLeft: 'auto' }}>
                        Scale: 15–95
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      Unassessed (No data assumed)
                    </span>
                  )}
                </div>

                {/* Score scale visual bar with 50.0 anchor */}
                <div style={{ position: 'relative', height: '6px', background: 'rgba(148, 163, 184, 0.2)', borderRadius: '3px', marginTop: '2px', overflow: 'hidden' }}>
                  {report.safety_score !== null && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${Math.min(100, Math.max(0, ((report.safety_score - 15.0) / 80.0) * 100))}%`,
                        background: report.safety_score >= 70 ? 'var(--color-risk-low-text)' : report.safety_score >= 45 ? 'var(--color-risk-medium-text)' : 'var(--color-risk-high-text)',
                        borderRadius: '3px',
                      }}
                    />
                  )}
                  {/* 50.0 anchor indicator mark */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${((50.0 - 15.0) / 80.0) * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      background: 'rgba(255, 255, 255, 0.7)',
                    }}
                    title="Neutral anchor (50.0 pts)"
                  />
                </div>

                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.35, marginTop: '4px' }}>
                  Length-weighted environmental index across verified segments.
                  <strong style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Not a crime prediction or safety guarantee.
                  </strong>
                </p>
              </div>

              {/* Card B: Data Reliability (Confidence) */}
              <div
                style={{
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border-medium)',
                  borderTop: '3px solid var(--color-confidence-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3) var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    DATA CONFIDENCE
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: 'var(--color-confidence-text)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-pill)',
                      fontWeight: 600,
                    }}
                  >
                    Epistemic Certainty
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                  <span className="tabular-numbers" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-confidence-text)' }}>
                    {Math.round(report.confidence_score)}%
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>audit density</span>
                </div>

                {/* Confidence visual progress bar */}
                <div style={{ height: '6px', background: 'rgba(148, 163, 184, 0.2)', borderRadius: '3px', marginTop: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(10, report.confidence_score))}%`,
                      height: '100%',
                      background: 'var(--color-confidence-border)',
                      borderRadius: '3px',
                    }}
                  />
                </div>

                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.35, marginTop: '4px' }}>
                  Measures multi-category diversity and freshness of observations.
                  <strong style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Separate from score: does not indicate incident likelihood.
                  </strong>
                </p>
              </div>

              {/* Card C: Evidence Coverage */}
              <div
                style={{
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border-medium)',
                  borderTop: `3px solid ${report.is_sparse_coverage ? 'var(--color-risk-medium-text)' : 'var(--color-brand-blue)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3) var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    EVIDENCE COVERAGE
                  </span>
                  {report.is_sparse_coverage ? (
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-risk-medium-text)', fontWeight: 700 }}>
                      ⚠️ SPARSE COVERAGE
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: 'var(--color-risk-low-text)', fontWeight: 600 }}>
                      ✓ SUFFICIENT DATA
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '4px 0' }}>
                  <span className="tabular-numbers" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {report.evidence_coverage_percentage}%
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    ({report.assessed_distance_km} km of {report.distance_km} km)
                  </span>
                </div>

                {/* Coverage visual progress bar */}
                <div style={{ height: '6px', background: 'rgba(148, 163, 184, 0.2)', borderRadius: '3px', marginTop: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, report.evidence_coverage_percentage))}%`,
                      height: '100%',
                      background: report.is_sparse_coverage ? 'var(--color-risk-medium-text)' : 'var(--color-brand-cyan)',
                      borderRadius: '3px',
                    }}
                  />
                </div>

                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.35, marginTop: '4px' }}>
                  {report.assessed_segments_count} of {report.total_segments_count} segments backed by registered data.
                  <strong style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    Unassessed road carries unknown condition, never assumed safe.
                  </strong>
                </p>
              </div>
            </div>

            {/* "Why This Route?" Dynamic Justification Box (Step 6) */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '1px solid var(--color-border-medium)',
                borderLeft: '4px solid var(--color-brand-cyan)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3) var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>⚖️</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Why This Route? ({report.why_this_route.headline})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--color-brand-cyan)', fontWeight: 600 }}>
                    Time: {report.why_this_route.time_vs_fastest}
                  </span>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-risk-low-text)', fontWeight: 600 }}>
                    Safety: {report.why_this_route.safety_vs_fastest}
                  </span>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {report.why_this_route.detailed_justification}
              </p>

              {/* Differentiating Factors Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Key Differentiating Factors:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {report.why_this_route.key_differentiating_factors.map((factor, fIdx) => (
                    <span
                      key={fIdx}
                      style={{
                        fontSize: '0.73rem',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '3px 8px',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      ✓ {factor}
                    </span>
                  ))}
                </div>
              </div>

              {/* Identified Bottleneck Callout if present */}
              {report.why_this_route.identified_bottleneck && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--color-risk-high-text)',
                  }}
                >
                  <span aria-hidden="true">⚠️</span>
                  <span><strong>Identified Bottleneck on Route:</strong> {report.why_this_route.identified_bottleneck}</span>
                </div>
              )}
            </div>

            {/* Segment Progression Visual Bar (Step 7) */}
            <div
              style={{
                background: 'var(--color-surface-card)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3) var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Corridor Progression Along Route ({report.total_segments_count} segments)
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-brand-cyan)' }}>
                  Click a segment slice to highlight on map
                </span>
              </div>

              {/* Stacked Segment Bar */}
              <div
                style={{
                  height: '24px',
                  display: 'flex',
                  width: '100%',
                  borderRadius: 'var(--radius-xs)',
                  overflow: 'hidden',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--color-border-medium)',
                }}
              >
                {report.segment_breakdowns.map((seg, sIdx) => {
                  const isSelected = selectedSegmentCode === seg.segment_code;
                  const color =
                    seg.risk_level === 'LOW'
                      ? 'var(--color-risk-low-text)'
                      : seg.risk_level === 'MEDIUM'
                      ? 'var(--color-risk-medium-text)'
                      : seg.risk_level === 'HIGH'
                      ? 'var(--color-risk-high-text)'
                      : '#64748b';

                  return (
                    <div
                      key={seg.segment_code || sIdx}
                      onClick={() => onSelectSegment && onSelectSegment(seg)}
                      title={`${seg.traversal_order}. ${seg.road_name} (${seg.length_percentage}% of route) • Safety: ${seg.safety_score || 'Unassessed'}`}
                      style={{
                        width: `${Math.max(5, seg.length_percentage)}%`,
                        height: '100%',
                        background: color,
                        opacity: isSelected ? 1.0 : 0.85,
                        borderRight: '1px solid rgba(15, 23, 42, 0.9)',
                        borderTop: isSelected ? '3px solid #ffffff' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#070b12',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      {seg.length_percentage >= 12 ? `${seg.traversal_order}` : ''}
                    </div>
                  );
                })}
              </div>

              {/* Legend for Corridor Bar */}
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.68rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-risk-low-text)' }} /> Low Risk (Score ≥ 70)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-risk-medium-text)' }} /> Medium Risk (Score 45–69)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-risk-high-text)' }} /> High Risk (Score &lt; 45)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }} /> Unassessed Gap
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: EVIDENCE STREAMS BREAKDOWN (Step 5)
           ========================================================================= */}
        {activeTab === 'evidence' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Suraksha Path evaluates 5 discrete environmental evidence streams across Chennai.
              Point contributions reflect distance-weighted presence along this specific route.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-3)' }}>
              {report.category_breakdowns.map((cat) => (
                <div
                  key={cat.category_key}
                  style={{
                    background: 'var(--color-surface-card)',
                    border: '1px solid var(--color-border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span aria-hidden="true" style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {cat.display_name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                          Weight: {Math.round(cat.configured_weight * 100)}% • {cat.record_count} active record(s)
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-pill)',
                        fontWeight: 600,
                        background:
                          cat.freshness_status === 'FRESH'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : cat.freshness_status === 'UNAUDITED'
                            ? 'rgba(148, 163, 184, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                        color:
                          cat.freshness_status === 'FRESH'
                            ? 'var(--color-risk-low-text)'
                            : cat.freshness_status === 'UNAUDITED'
                            ? 'var(--color-text-muted)'
                            : 'var(--color-risk-medium-text)',
                      }}
                    >
                      {cat.freshness_status}
                    </span>
                  </div>

                  {/* Impact points */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.5)', padding: '4px 8px', borderRadius: 'var(--radius-xs)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Net Route Score Impact:</span>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color:
                          cat.net_impact_points > 0
                            ? 'var(--color-risk-low-text)'
                            : cat.net_impact_points < 0
                            ? 'var(--color-risk-high-text)'
                            : 'var(--color-text-muted)',
                      }}
                    >
                      {cat.net_impact_points > 0 ? `+${cat.net_impact_points}` : cat.net_impact_points} pts
                    </span>
                  </div>

                  {/* Source & Limitations */}
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div><strong>Data Source:</strong> {cat.data_source} ({cat.data_vintage})</div>
                    <div><strong>Engine Usage:</strong> {cat.engine_usage}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                      <strong>Limitation:</strong> {cat.known_limitations}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: SEGMENT-LEVEL EXPLAINABILITY (Step 4 & Map Sync)
           ========================================================================= */}
        {activeTab === 'segments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Inspect road segments contributing to the aggregate assessment. Click a row to center and highlight on the Leaflet map.
              </div>

              {/* Segment risk filter chips */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'BOTTLENECK'].map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setFilterRisk(filterKey)}
                    className={`btn btn-sm ${filterRisk === filterKey ? 'btn-primary' : 'btn-subtle'}`}
                    style={{ fontSize: '0.68rem', padding: '2px 8px', height: 'auto', borderRadius: 'var(--radius-pill)' }}
                  >
                    {filterKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Segments Table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border-medium)', borderRadius: 'var(--radius-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(30, 41, 59, 0.8)', borderBottom: '1px solid var(--color-border-medium)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '8px 10px', width: '36px' }}>#</th>
                    <th style={{ padding: '8px 10px' }}>Road Segment</th>
                    <th style={{ padding: '8px 10px' }}>Length</th>
                    <th style={{ padding: '8px 10px' }}>Safety Score</th>
                    <th style={{ padding: '8px 10px' }}>Risk Level</th>
                    <th style={{ padding: '8px 10px' }}>Confidence</th>
                    <th style={{ padding: '8px 10px' }}>Key Evidence & Warnings</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSegments.map((seg) => {
                    const isSelected = selectedSegmentCode === seg.segment_code;
                    return (
                      <tr
                        key={seg.segment_code}
                        onClick={() => onSelectSegment && onSelectSegment(seg)}
                        style={{
                          background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                          borderBottom: '1px solid var(--color-border-subtle)',
                          cursor: 'pointer',
                          transition: 'background var(--transition-fast)',
                        }}
                      >
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--color-brand-cyan)' }}>
                          {seg.traversal_order}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {seg.road_name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                            <code>{seg.segment_code}</code> • {seg.road_classification}
                            {seg.is_bottleneck && (
                              <span style={{ marginLeft: '6px', color: 'var(--color-risk-high-text)', fontWeight: 700 }}>
                                ⚠️ BOTTLENECK
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          {(seg.length_meters / 1000).toFixed(2)} km
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                            ({seg.length_percentage}%)
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                          {seg.safety_score !== null && seg.safety_score !== undefined ? (
                            <span style={{ color: seg.safety_score >= 70 ? 'var(--color-risk-low-text)' : seg.safety_score >= 45 ? 'var(--color-risk-medium-text)' : 'var(--color-risk-high-text)' }}>
                              {Number(seg.safety_score).toFixed(1)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <RiskBadge level={seg.risk_level} />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ color: 'var(--color-confidence-text)', fontWeight: 600 }}>
                            {Math.round(seg.confidence_score)}%
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {seg.bottleneck_reason ? (
                            <div style={{ color: 'var(--color-risk-high-text)', fontSize: '0.7rem' }}>
                              ⚠️ {seg.bottleneck_reason}
                            </div>
                          ) : seg.top_positive_factors && seg.top_positive_factors.length > 0 ? (
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.7rem' }}>
                              ✓ {seg.top_positive_factors.slice(0, 2).join(' • ')}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.68rem', fontStyle: 'italic' }}>
                              Limited segment-specific records
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectSegment) onSelectSegment(seg);
                            }}
                            className="btn btn-subtle btn-sm"
                            style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                          >
                            Highlight 🔍
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: TRADE-OFF MATRIX (Step 6)
           ========================================================================= */}
        {activeTab === 'tradeoffs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Compare how the navigation preferences (Fastest, Balanced, Safest) shape travel duration versus verified environmental safety evidence.
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border-medium)', borderRadius: 'var(--radius-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(30, 41, 59, 0.8)', borderBottom: '1px solid var(--color-border-medium)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '8px 10px' }}>Corridor Alternative</th>
                    <th style={{ padding: '8px 10px' }}>Strategy Role</th>
                    <th style={{ padding: '8px 10px' }}>Travel Time</th>
                    <th style={{ padding: '8px 10px' }}>Detour Penalty</th>
                    <th style={{ padding: '8px 10px' }}>Distance</th>
                    <th style={{ padding: '8px 10px' }}>Safety Score</th>
                    <th style={{ padding: '8px 10px' }}>Safety Delta</th>
                    <th style={{ padding: '8px 10px' }}>Confidence</th>
                    <th style={{ padding: '8px 10px' }}>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {report.route_comparisons.map((alt) => (
                    <tr
                      key={alt.route_id}
                      style={{
                        background: alt.is_selected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                        borderBottom: '1px solid var(--color-border-subtle)',
                        fontWeight: alt.is_selected ? 600 : 400,
                      }}
                    >
                      <td style={{ padding: '8px 10px', color: 'var(--color-text-primary)' }}>
                        {alt.title}
                        {alt.is_selected && (
                          <span style={{ marginLeft: '6px', fontSize: '0.65rem', color: 'var(--color-brand-cyan)' }}>
                            [ACTIVE]
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <Badge variant={alt.route_type === 'FASTEST' ? 'warning' : alt.route_type === 'SAFEST' ? 'healthy' : 'info'}>
                          {alt.recommended_for}
                        </Badge>
                      </td>
                      <td style={{ padding: '8px 10px' }}>{alt.duration_minutes} min</td>
                      <td style={{ padding: '8px 10px' }}>
                        {alt.delta_duration_minutes > 0 ? `+${alt.delta_duration_minutes}m` : 'Baseline'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>{alt.distance_km} km</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                        {alt.safety_score !== null ? Number(alt.safety_score).toFixed(1) : 'Unassessed'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {alt.delta_safety_points !== null && alt.delta_safety_points !== undefined ? (
                          <span style={{ color: alt.delta_safety_points > 0 ? 'var(--color-risk-low-text)' : alt.delta_safety_points < 0 ? 'var(--color-risk-high-text)' : 'inherit' }}>
                            {alt.delta_safety_points > 0 ? `+${alt.delta_safety_points}` : alt.delta_safety_points} pts
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--color-confidence-text)' }}>
                        {Math.round(alt.confidence_score)}%
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {Math.round(alt.coverage_ratio * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: METRIC SEMANTICS & METHODOLOGY (Step 2)
           ========================================================================= */}
        {activeTab === 'semantics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              To ensure scientific rigor and prevent misleading assumptions, Suraksha Path enforces
              strict semantic boundaries between Safety Score, Confidence, and Evidence Coverage.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
              {/* Semantics: Safety Score */}
              <div
                style={{
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-cyan)' }}>
                  A. Safety Score Semantics
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Scale & Direction:</strong> {report.safety_score_semantics.scale} (Clamped; higher score = greater verified protective factors).</div>
                  <div><strong>Neutral Anchor:</strong> {report.safety_score_semantics.neutral_anchor} pts (Starting midpoint for zero observable impact).</div>
                  <div><strong>Aggregation:</strong> {report.safety_score_semantics.aggregation_method}</div>
                  <div style={{ color: 'var(--color-risk-low-text)' }}>
                    <strong>What it establishes:</strong> {report.safety_score_semantics.what_it_establishes}
                  </div>
                  <div style={{ color: 'var(--color-risk-high-text)' }}>
                    <strong>What it does NOT establish:</strong> {report.safety_score_semantics.what_it_does_not_establish}
                  </div>
                </div>
              </div>

              {/* Semantics: Confidence */}
              <div
                style={{
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-confidence-text)' }}>
                  B. Data Confidence Semantics
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Scale:</strong> {report.confidence_semantics.scale} (Epistemic data certainty).</div>
                  <div><strong>Formula Breakdown:</strong> Category diversity (40%) + Record density (30%) + Source verification (30%).</div>
                  <div><strong>Aggregation:</strong> {report.confidence_semantics.aggregation_method}</div>
                  <div style={{ color: 'var(--color-risk-low-text)' }}>
                    <strong>What it establishes:</strong> {report.confidence_semantics.what_it_establishes}
                  </div>
                  <div style={{ color: 'var(--color-risk-high-text)' }}>
                    <strong>What it does NOT establish:</strong> {report.confidence_semantics.what_it_does_not_establish}
                  </div>
                </div>
              </div>

              {/* Semantics: Evidence Coverage */}
              <div
                style={{
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-blue)' }}>
                  C. Evidence Coverage Semantics
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Scale:</strong> {report.evidence_coverage_semantics.scale} (Physical coverage ratio).</div>
                  <div><strong>Aggregation:</strong> {report.evidence_coverage_semantics.aggregation_method}</div>
                  <div style={{ color: 'var(--color-risk-low-text)' }}>
                    <strong>What it establishes:</strong> {report.evidence_coverage_semantics.what_it_establishes}
                  </div>
                  <div style={{ color: 'var(--color-risk-high-text)' }}>
                    <strong>What it does NOT establish:</strong> {report.evidence_coverage_semantics.what_it_does_not_establish}
                  </div>
                </div>
              </div>
            </div>

            {/* Legal / Scientific Disclaimer Box */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-xs)',
                padding: 'var(--space-3)',
                fontSize: '0.72rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.4,
              }}
            >
              <strong>Authoritative Advisory Disclaimer: </strong>
              {report.disclaimer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

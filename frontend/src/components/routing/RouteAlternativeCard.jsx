import React from 'react';
import { ROUTE_TYPES } from '../../utils/constants';
import { RiskBadge } from '../common/RiskBadge';

/**
 * RouteAlternativeCard component.
 * Reusable presentation pattern for route alternatives: FASTEST, BALANCED, and SAFEST.
 * Displays travel duration, distance, segment evidence, safety score vs confidence,
 * and transparent Phase 10 time–safety trade-off explanations.
 */
export function RouteAlternativeCard({
  route,
  isSelected = false,
  onSelect,
  className = '',
}) {
  if (!route) return null;

  const routeId = route.route_id || route.id || route.route_type || route.routeType;
  const routeType = route.route_type || route.routeType || 'BALANCED';
  const title = route.title || '';
  const durationMin =
    route.metrics?.duration_minutes !== undefined
      ? route.metrics.duration_minutes
      : route.durationMinutes;
  const distanceKmVal =
    route.metrics?.distance_km !== undefined
      ? route.metrics.distance_km
      : route.distanceKm;
  const summaryRoads = route.summary || '';
  const safetyDisclaimer =
    route.safety_disclaimer ||
    'Safety scoring advisory. Navigation metrics reflect estimated road distance and travel time.';

  const detourPenalty =
    route.detour_penalty_minutes !== undefined
      ? route.detour_penalty_minutes
      : (route.delta_time_minutes || 0.0);

  const safetyAdvantage = route.safety_advantage_points;
  const tradeoffExplanation = route.tradeoff_explanation;
  const coverageRatio = route.evidence_coverage_ratio;
  const coveragePct = coverageRatio !== undefined && coverageRatio !== null ? Math.round(coverageRatio * 100) : null;
  const fitScore = route.preference_fit_score !== undefined && route.preference_fit_score !== null ? Math.round(route.preference_fit_score) : null;

  const typeConfig = ROUTE_TYPES[routeType] || {
    key: routeType,
    title: title || 'Route Alternative',
    tag: routeType,
    description: 'Calculated road corridor from OpenStreetMap routing engine',
  };

  return (
    <div
      onClick={() => onSelect && onSelect(routeId, routeType)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onSelect) {
          e.preventDefault();
          onSelect(routeId, routeType);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${typeConfig.title}: ${durationMin} minutes, ${distanceKmVal} km, Safety Score ${route.safety_score || 'unassessed'}`}
      className={`route-alternative-card ${className}`}
      style={{
        background: isSelected ? 'var(--color-surface-elevated)' : 'var(--color-surface-panel)',
        border: isSelected ? '2px solid var(--color-border-active)' : '1px solid var(--color-border-medium)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-4)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        position: 'relative',
      }}
    >
      {/* Header: Title, Strategy Tag, and Active Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {title || typeConfig.title}
            </span>
            <span
              className={`badge ${isSelected ? 'badge-info' : 'badge-status'}`}
              style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', fontWeight: 700 }}
            >
              {typeConfig.tag}
            </span>
            {isSelected && (
              <span
                style={{
                  fontSize: '0.65rem',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: 'var(--color-brand-cyan)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                RECOMMENDED
              </span>
            )}
            {fitScore !== null && (
              <span
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--color-text-muted)',
                }}
                title="Algorithmic fit score for requested preference"
              >
                Fit: {fitScore}%
              </span>
            )}
          </div>
          {summaryRoads ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-brand-cyan)', margin: 0, marginTop: '2px' }}>
              via {summaryRoads}
            </p>
          ) : (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, marginTop: '2px' }}>
              {typeConfig.description}
            </p>
          )}
        </div>

        {/* Selected Radio Indicator */}
        <div
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: isSelected ? '5px solid var(--color-brand-blue)' : '2px solid var(--color-border-medium)',
            background: isSelected ? '#ffffff' : 'transparent',
            flexShrink: 0,
            marginTop: '2px',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Trade-Off Metric Comparison Chips (Phase 10) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {/* Detour penalty chip */}
        <span
          style={{
            fontSize: '0.7rem',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            background: detourPenalty > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: detourPenalty > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
            color: detourPenalty > 0 ? 'var(--color-risk-medium-text)' : 'var(--color-risk-low-text)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>⏱️</span>
          <span>{detourPenalty > 0 ? `+${detourPenalty}m Detour` : 'Fastest Baseline Time'}</span>
        </span>

        {/* Safety advantage chip */}
        {safetyAdvantage !== null && safetyAdvantage !== undefined ? (
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              background: safetyAdvantage > 0 ? 'rgba(16, 185, 129, 0.12)' : (safetyAdvantage < 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(148, 163, 184, 0.12)'),
              border: safetyAdvantage > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : (safetyAdvantage < 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(148, 163, 184, 0.3)'),
              color: safetyAdvantage > 0 ? 'var(--color-risk-low-text)' : (safetyAdvantage < 0 ? 'var(--color-risk-high-text)' : 'var(--color-text-muted)'),
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>🛡️</span>
            <span>{safetyAdvantage > 0 ? `+${safetyAdvantage} pts Safety` : (safetyAdvantage < 0 ? `${safetyAdvantage} pts Safety` : 'Baseline Safety Score')}</span>
          </span>
        ) : null}

        {/* Evidence coverage chip */}
        {coveragePct !== null && (
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: 'var(--color-brand-cyan)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>📊</span>
            <span>{coveragePct}% Evidence Coverage</span>
          </span>
        )}

        {/* Phase 13: Time-of-Day & Environmental Contextual Chip */}
        {route.contextual_report && (
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#a5b4fc',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title={route.contextual_report.environmental_context?.weather_description || 'Contextual modifier'}
          >
            <span>{route.contextual_report.solar_context?.is_dark ? '🌙' : '☀️'}</span>
            <span>
              {route.contextual_report.solar_context?.solar_phase?.replace('_', ' ')} •{' '}
              {route.contextual_report.contextual_modifier_mean_pts >= 0 ? '+' : ''}
              {route.contextual_report.contextual_modifier_mean_pts} pts
            </span>
          </span>
        )}

        {/* Phase 13: Waterlogging vulnerability tag */}
        {route.contextual_report?.vulnerable_segments_count > 0 && (
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--color-risk-high-text)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>⚠️</span>
            <span>{route.contextual_report.vulnerable_segments_count} Underpass Hotspot(s)</span>
          </span>
        )}
      </div>

      {/* Metrics Row: Time & Distance */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 'var(--space-2)',
          background: 'var(--color-surface-card)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid var(--color-border-subtle)',
        }}
      >
        {/* Travel Time */}
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            EST. TRAVEL TIME (FREE-FLOW)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="tabular-numbers" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {durationMin !== undefined ? durationMin : '—'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>min</span>
            {detourPenalty > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-risk-medium-text)', marginLeft: '6px' }}>
                (+{detourPenalty}m)
              </span>
            )}
          </div>
        </div>

        {/* Road Distance */}
        <div style={{ borderLeft: '1px solid var(--color-border-subtle)', paddingLeft: 'var(--space-3)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            ROAD DISTANCE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="tabular-numbers" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {distanceKmVal !== undefined ? distanceKmVal : '—'}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>km</span>
          </div>
        </div>
      </div>

      {/* Phase 8 Safety & Risk Assessment Engine Panel */}
      <div
        style={{
          background: 'var(--color-surface-card)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid var(--color-border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            SAFETY SCORE (ADVISORY)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: '2px', flexWrap: 'wrap' }}>
            {route.safety_score !== null && route.safety_score !== undefined ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                  <span className="tabular-numbers" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {typeof route.safety_score === 'number' ? route.safety_score.toFixed(1) : route.safety_score}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>/ 100</span>
                </div>
                <RiskBadge
                  level={
                    route.safety_score >= 70.0
                      ? 'LOW'
                      : route.safety_score >= 45.0
                      ? 'MEDIUM'
                      : 'HIGH'
                  }
                />
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RiskBadge level="UNASSESSED" />
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  (No baseline evidence assumed)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Confidence & Coverage Indicator (distinct from Safety Score) */}
        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            DATA RELIABILITY (CONFIDENCE)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <span
              className="tabular-numbers"
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--color-confidence-text)',
              }}
            >
              {route.confidence_score !== undefined ? Math.round(route.confidence_score) : 10}%
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>confidence</span>
          </div>
        </div>
      </div>

      {/* Phase 10 Safety–Time Trade-Off Explainability Section */}
      {tradeoffExplanation && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.75)',
            borderLeft: '3px solid var(--color-brand-cyan)',
            borderRadius: 'var(--radius-xs)',
            padding: 'var(--space-2) var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--color-brand-cyan)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⚖️</span>
            <span>Safety–Time Trade-Off Assessment</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
            {tradeoffExplanation}
          </p>
          {route.bottleneck_reason && (
            <div style={{ fontSize: '0.72rem', color: 'var(--color-risk-medium-text)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>⚠️</span>
              <span><strong>Identified Bottleneck:</strong> {route.bottleneck_reason}</span>
            </div>
          )}
        </div>
      )}

      {/* Traversed Road Segments */}
      {route.segments && route.segments.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-xs)',
            padding: 'var(--space-2) var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              TRAVERSED ROAD SEGMENTS ({route.segments.length})
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-brand-cyan)' }}>
              OpenStreetMap Verified
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
            {route.segments.map((seg, sIdx) => (
              <span
                key={seg.segment_code || sIdx}
                style={{
                  fontSize: '0.7rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--color-border-medium)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '2px 6px',
                  color: 'var(--color-text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={`${seg.name} • ${seg.length_meters ? (seg.length_meters / 1000).toFixed(2) + ' km' : ''}`}
              >
                <span style={{ color: 'var(--color-brand-cyan)', fontWeight: 600 }}>{sIdx + 1}.</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{seg.name}</span>
                {seg.length_meters && (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>
                    ({seg.length_meters >= 1000 ? (seg.length_meters / 1000).toFixed(1) + ' km' : Math.round(seg.length_meters) + ' m'})
                  </span>
                )}
                {seg.safety_score !== null && seg.safety_score !== undefined ? (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: 'var(--color-brand-cyan)',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontWeight: 600,
                    }}
                  >
                    Score: {typeof seg.safety_score === 'number' ? seg.safety_score.toFixed(1) : seg.safety_score}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>
                    (Unassessed)
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Safety Status Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: 'var(--radius-xs)',
          padding: '4px 8px',
          fontSize: '0.72rem',
          color: 'var(--color-confidence-text)',
        }}
      >
        <span aria-hidden="true">ℹ️</span>
        <span style={{ lineHeight: 1.35 }}>{safetyDisclaimer}</span>
      </div>

      {/* Phase 11 Explainability Dashboard Jump Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
        <a
          href="#route-explainability-section"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(routeId, routeType);
            const el = document.getElementById('route-explainability-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="btn btn-subtle btn-sm"
          style={{
            fontSize: '0.72rem',
            padding: '3px 8px',
            color: 'var(--color-brand-cyan)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            textDecoration: 'none',
          }}
        >
          <span>📊</span>
          <span>Inspect Explainability & Confidence</span>
        </a>

        {route.explainability && (
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
            ✓ Explainability Verified
          </span>
        )}
      </div>
    </div>
  );
}

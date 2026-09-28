import React, { useState } from 'react';
import { PageHeader } from '../common/PageHeader';
import { StatusBadge } from '../common/StatusBadge';
import { RouteExplainabilityDashboard } from '../routing/RouteExplainabilityDashboard';

// Canonical Chennai demonstration corridor alternatives for standalone explainability inspection
const DEMO_ALTERNATIVES = [
  {
    route_id: 'ROUTE-ALT-1',
    route_type: 'FASTEST',
    recommended_for: 'FASTEST',
    title: 'Arterial Corridor via Anna Salai (Direct)',
    summary: 'Anna Salai, Mount Road, Usman Road',
    metrics: {
      distance_meters: 9480.0,
      distance_km: 9.48,
      duration_seconds: 650.0,
      duration_minutes: 10.8,
      duration_type: 'ESTIMATED_FREE_FLOW',
      traffic_aware: false,
    },
    safety_score: 62.5,
    confidence_score: 75.0,
    evidence_coverage_ratio: 0.85,
    detour_penalty_minutes: 0.0,
    safety_advantage_points: 0.0,
    preference_fit_score: 100.0,
    bottleneck_segment_code: 'SEG-OSM-W24483756-02',
    bottleneck_reason: 'Unlit flyover underpass stretch with limited natural surveillance',
    is_selected: false,
    segments: [
      {
        segment_code: 'SEG-OSM-W24483756-01',
        name: 'Anna Salai North (Periyamet)',
        length_meters: 3200.0,
        safety_score: 74.0,
        confidence_score: 85.0,
        road_classification: 'primary',
        corridor: 'Anna Salai',
        key_factors: ['Lighting: Municipal LED', 'Police: Station beat'],
      },
      {
        segment_code: 'SEG-OSM-W24483756-02',
        name: 'Anna Salai Flyover Underpass',
        length_meters: 2800.0,
        safety_score: 48.0,
        confidence_score: 70.0,
        road_classification: 'primary',
        corridor: 'Anna Salai',
        is_bottleneck: true,
        bottleneck_reason: 'Unlit flyover underpass stretch with limited natural surveillance',
        key_factors: ['Unlit underpass stretch', 'High speed vehicular flow'],
      },
      {
        segment_code: 'SEG-OSM-W24483756-03',
        name: 'Anna Salai South (Thousand Lights)',
        length_meters: 3480.0,
        safety_score: 68.0,
        confidence_score: 78.0,
        road_classification: 'primary',
        corridor: 'Anna Salai',
        key_factors: ['Commercial activity', 'Moderate lighting'],
      },
    ],
  },
  {
    route_id: 'ROUTE-ALT-2',
    route_type: 'BALANCED',
    recommended_for: 'BALANCED',
    title: 'Commercial Bypass via EVR Periyar Salai & GN Chetty Road',
    summary: 'EVR Periyar Salai, GN Chetty Road, T. Nagar',
    metrics: {
      distance_meters: 10150.0,
      distance_km: 10.15,
      duration_seconds: 740.0,
      duration_minutes: 12.3,
      duration_type: 'ESTIMATED_FREE_FLOW',
      traffic_aware: false,
    },
    safety_score: 78.5,
    confidence_score: 84.0,
    evidence_coverage_ratio: 0.90,
    detour_penalty_minutes: 1.5,
    safety_advantage_points: 16.0,
    preference_fit_score: 95.0,
    bottleneck_segment_code: null,
    bottleneck_reason: null,
    is_selected: true,
    segments: [
      {
        segment_code: 'SEG-OSM-W35591200-01',
        name: 'EVR Periyar Salai West',
        length_meters: 3500.0,
        safety_score: 76.0,
        confidence_score: 82.0,
        road_classification: 'primary',
        corridor: 'Poonamallee Corridor',
        key_factors: ['Lighting: Smart LED', 'Wide divided carriageway'],
      },
      {
        segment_code: 'SEG-OSM-W35591200-02',
        name: 'GN Chetty Commercial Avenue',
        length_meters: 4200.0,
        safety_score: 82.0,
        confidence_score: 88.0,
        road_classification: 'primary',
        corridor: 'T. Nagar Commercial',
        key_factors: ['High commercial footfall', 'Active police booth'],
      },
      {
        segment_code: 'SEG-OSM-W35591200-03',
        name: 'Usman Road Terminal Approach',
        length_meters: 2450.0,
        safety_score: 77.0,
        confidence_score: 82.0,
        road_classification: 'secondary',
        corridor: 'T. Nagar',
        key_factors: ['Paved pedestrian footpath', 'Street lighting: Active'],
      },
    ],
  },
  {
    route_id: 'ROUTE-ALT-3',
    route_type: 'SAFEST',
    recommended_for: 'SAFEST',
    title: 'Continuous Illumination Corridor via Kamarajar & RK Salai',
    summary: 'Kamarajar Salai, Dr. Radhakrishnan Salai, GN Chetty Road',
    metrics: {
      distance_meters: 11400.0,
      distance_km: 11.40,
      duration_seconds: 880.0,
      duration_minutes: 14.7,
      duration_type: 'ESTIMATED_FREE_FLOW',
      traffic_aware: false,
    },
    safety_score: 88.5,
    confidence_score: 92.0,
    evidence_coverage_ratio: 0.95,
    detour_penalty_minutes: 3.9,
    safety_advantage_points: 26.0,
    preference_fit_score: 98.0,
    bottleneck_segment_code: null,
    bottleneck_reason: null,
    is_selected: false,
    segments: [
      {
        segment_code: 'SEG-OSM-W88910244-01',
        name: 'Kamarajar Promenade (Marina)',
        length_meters: 4200.0,
        safety_score: 91.0,
        confidence_score: 95.0,
        road_classification: 'primary',
        corridor: 'Coastal Promenade',
        key_factors: ['Continuous high-mast LED lighting', 'Police patrol booth', 'High public footfall'],
      },
      {
        segment_code: 'SEG-OSM-W88910244-02',
        name: 'Dr. Radhakrishnan Salai Arterial',
        length_meters: 4400.0,
        safety_score: 87.0,
        confidence_score: 90.0,
        road_classification: 'primary',
        corridor: 'Mylapore / Gopalapuram',
        key_factors: ['Divided multi-lane carriageway', 'Continuous sidewalk network'],
      },
      {
        segment_code: 'SEG-OSM-W88910244-03',
        name: 'GN Chetty South Corridor',
        length_meters: 2800.0,
        safety_score: 86.0,
        confidence_score: 89.0,
        road_classification: 'primary',
        corridor: 'T. Nagar Commercial',
        key_factors: ['Verified street lighting', 'Active commercial presence'],
      },
    ],
  },
];

export function RouteResultsView() {
  const [selectedRouteId, setSelectedRouteId] = useState('ROUTE-ALT-2');
  const [selectedSegmentCode, setSelectedSegmentCode] = useState(null);

  const selectedRoute =
    DEMO_ALTERNATIVES.find((r) => r.route_id === selectedRouteId) ||
    DEMO_ALTERNATIVES[1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title="Route Explainability & Confidence Dashboard"
        description="Inspect what the Safety Score represents, how Confidence measures evidence reliability, and why navigation alternatives differ across Chennai corridors."
        badge={<StatusBadge label="PHASE 11 DASHBOARD" variant="status" />}
      />

      {/* Alternative Selector Bar */}
      <div
        style={{
          background: 'var(--color-surface-panel)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Select Route Corridor to Inspect:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {DEMO_ALTERNATIVES.map((alt) => {
              const isSelected = alt.route_id === selectedRouteId;
              return (
                <button
                  key={alt.route_id}
                  type="button"
                  onClick={() => {
                    setSelectedRouteId(alt.route_id);
                    setSelectedSegmentCode(null);
                  }}
                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-subtle'}`}
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: 'var(--radius-pill)',
                    padding: '4px 12px',
                  }}
                >
                  {alt.route_type === 'FASTEST' ? '⚡ ' : alt.route_type === 'BALANCED' ? '⚖️ ' : '🛡️ '}
                  {alt.route_type} ({alt.metrics.duration_minutes}m • Score {alt.safety_score})
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
          Active Corridor: <strong>Central ➔ T. Nagar</strong>
        </div>
      </div>

      {/* Embedded Explainability Dashboard */}
      <RouteExplainabilityDashboard
        route={selectedRoute}
        allAlternatives={DEMO_ALTERNATIVES}
        selectedSegmentCode={selectedSegmentCode}
        onSelectSegment={(seg) => setSelectedSegmentCode(seg?.segment_code || null)}
        departureTime="21:30"
      />
    </div>
  );
}

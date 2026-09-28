import React, { useState, useEffect, useMemo } from 'react';
import { SectionPanel } from '../common/SectionPanel';
import { MetricDisplay } from '../common/MetricDisplay';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import {
  loadJourneyHistory,
  clearJourneyHistory,
  calculateJourneyMetrics,
} from '../../services/journeyStorage';

/**
 * JourneyInsightsDashboard Component (Phase 15, Steps 2, 3, 9, 10, 11).
 * Interactive dashboard providing transparent journey activity metrics,
 * time-range and route-type filtering, accessible visual charts, and local privacy management.
 */
export function JourneyInsightsDashboard({ onNavigateToPlanner = null }) {
  // Local storage history state
  const [historyRecords, setHistoryRecords] = useState(() => loadJourneyHistory());

  // Filter States
  const [timeRange, setTimeRange] = useState('all'); // '7d' | '30d' | 'all'
  const [routeTypeFilter, setRouteTypeFilter] = useState('ALL'); // 'ALL' | 'FASTEST' | 'BALANCED' | 'SAFEST'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'CANCELLED'
  const [includeDemo, setIncludeDemo] = useState(false);

  // Privacy and UI states
  const [maskAddresses, setMaskAddresses] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [chartViewMode, setChartViewMode] = useState('chart'); // 'chart' | 'table'

  // Refresh history records on mount and storage changes
  const refreshHistory = () => {
    const recs = loadJourneyHistory();
    setHistoryRecords(recs);
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  // Compute metrics dynamically via pure calculation function
  const metrics = useMemo(() => {
    return calculateJourneyMetrics(historyRecords, {
      timeRange,
      routeType: routeTypeFilter,
      status: statusFilter,
      includeDemo,
    });
  }, [historyRecords, timeRange, routeTypeFilter, statusFilter, includeDemo]);

  // Handle clearing history with confirmation
  const handleClearHistory = () => {
    clearJourneyHistory();
    setHistoryRecords([]);
    setConfirmClearOpen(false);
  };

  // Helper to format minutes into hours & mins
  const formatMinutes = (totalMin) => {
    if (totalMin <= 0) return '0 min';
    const hrs = Math.floor(totalMin / 60);
    const mins = Math.round(totalMin % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  // Helper to mask addresses for privacy
  const formatLocation = (loc) => {
    if (!maskAddresses || !loc) return loc;
    const parts = loc.split(',');
    if (parts.length > 1) {
      return `${parts[0].slice(0, 4)}***, Chennai`;
    }
    return `${loc.slice(0, 4)}***`;
  };

  const hasJourneys = metrics.totalJourneys > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* 1. Dashboard Header & Global Privacy Banner */}
      <div
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-4)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
              Commuter Journey Insights
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#60a5fa',
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              LOCAL BROWSER ONLY
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            All journey telemetry is stored strictly in your browser. Cancelled trips are strictly excluded from completed travel distances.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={maskAddresses}
              onChange={(e) => setMaskAddresses(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Mask Addresses
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmClearOpen(true)}
            disabled={historyRecords.length === 0}
          >
            🗑️ Clear History
          </Button>
        </div>
      </div>

      {/* Confirmation Modal for Clearing History */}
      {confirmClearOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              background: 'var(--color-surface-panel)',
              border: '1px solid var(--color-border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-5)',
              maxWidth: '440px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
            }}
          >
            <h3 id="clear-modal-title" style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>
              Clear Journey History?
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              This will permanently delete all {historyRecords.length} recorded journeys stored on this device.
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Button variant="outline" size="sm" onClick={() => setConfirmClearOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleClearHistory}>
                Yes, Clear All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Time Range & Filter Controls */}
      <div
        style={{
          background: 'var(--color-surface-panel)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
        }}
      >
        {/* Time Range Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            TIME RANGE:
          </span>
          {[
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: 'all', label: 'All Recorded' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setTimeRange(btn.id)}
              style={{
                background: timeRange === btn.id ? 'var(--color-brand-blue)' : 'var(--color-surface-card)',
                color: timeRange === btn.id ? '#ffffff' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-xs)',
                padding: '4px 10px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: timeRange === btn.id ? 700 : 500,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Route Type & Status Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label htmlFor="filter-route-type" style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              ROUTE:
            </label>
            <select
              id="filter-route-type"
              value={routeTypeFilter}
              onChange={(e) => setRouteTypeFilter(e.target.value)}
              style={{
                background: 'var(--color-surface-card)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-primary)',
                fontSize: '0.78rem',
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <option value="ALL">All Routes</option>
              <option value="FASTEST">Fastest</option>
              <option value="BALANCED">Balanced</option>
              <option value="SAFEST">Safest</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label htmlFor="filter-status" style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
              STATUS:
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'var(--color-surface-card)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-primary)',
                fontSize: '0.78rem',
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed Only</option>
              <option value="CANCELLED">Cancelled Only</option>
            </select>
          </div>

          {/* Demo Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#fbbf24', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => setIncludeDemo(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Include Chennai Demo Sample
          </label>
        </div>
      </div>

      {/* 3. Key Metrics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        <MetricDisplay
          label="Completed Journeys"
          value={metrics.completedJourneys}
          unit={metrics.totalJourneys > 0 ? `of ${metrics.totalJourneys}` : ''}
          subtext={metrics.cancelledJourneys > 0 ? `${metrics.cancelledJourneys} cancelled trips excluded` : 'All scheduled trips completed'}
          variant="safety"
          icon="✅"
        />

        <MetricDisplay
          label="Travel Distance"
          value={metrics.totalDistanceKm}
          unit="km"
          subtext="Strictly completed trips"
          variant="info"
          icon="📍"
        />

        <MetricDisplay
          label="Travel Time"
          value={formatMinutes(metrics.totalDurationMinutes)}
          subtext={`Avg: ${metrics.averageDurationMinutes} min / trip`}
          variant="default"
          icon="⏱️"
        />

        <MetricDisplay
          label="Avg. Safety Score"
          value={metrics.averageSafetyScore != null ? metrics.averageSafetyScore : '—'}
          unit={metrics.averageSafetyScore != null ? '/ 100' : ''}
          subtext="Evaluated corridor safety"
          variant="safety"
          icon="🛡️"
        />

        <MetricDisplay
          label="Avg. Confidence"
          value={metrics.averageConfidenceScore != null ? `${Math.round(metrics.averageConfidenceScore)}%` : '—'}
          subtext="Evidence completeness"
          variant="confidence"
          icon="📊"
        />
      </div>

      {/* Empty State when no journeys recorded */}
      {!hasJourneys ? (
        <SectionPanel title="Journey Activity Records">
          <EmptyState
            title="No Journey Records Found"
            message={
              includeDemo
                ? "No journeys match the active filter criteria."
                : "You haven't recorded any completed journeys yet on this browser. Plan a route and complete a monitored trip to view personalized insights, or enable Chennai Demo Sample."
            }
            actionLabel={onNavigateToPlanner ? "Plan a Journey" : undefined}
            onAction={onNavigateToPlanner}
          />
          {!includeDemo && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
              <Button variant="outline" size="sm" onClick={() => setIncludeDemo(true)}>
                🧪 Load Chennai Sample Data to Preview Charts
              </Button>
            </div>
          )}
        </SectionPanel>
      ) : (
        <>
          {/* 4. Visualizations Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            {/* Chart 1: Completed Journeys Over Time */}
            <SectionPanel
              title="Daily Journey Activity"
              badge={`${metrics.dailyActivity.length} ACTIVE DAYS`}
              badgeVariant="neutral"
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => setChartViewMode(chartViewMode === 'chart' ? 'table' : 'chart')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-brand-blue)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {chartViewMode === 'chart' ? 'View as table' : 'View as chart'}
                </button>
              </div>

              {chartViewMode === 'chart' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div
                    role="img"
                    aria-label="Bar chart showing journeys recorded per day"
                    style={{
                      height: '140px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '8px',
                      padding: 'var(--space-2) 0',
                      borderBottom: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    {metrics.dailyActivity.map((day) => {
                      const maxCount = Math.max(...metrics.dailyActivity.map((d) => d.count), 1);
                      const heightPct = Math.round((day.count / maxCount) * 100);
                      return (
                        <div
                          key={day.date}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            height: '100%',
                            justifyContent: 'flex-end',
                          }}
                          title={`${day.date}: ${day.count} journey(s), ${day.distance_km} km`}
                        >
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
                            {day.count}
                          </span>
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '32px',
                              height: `${Math.max(12, heightPct)}%`,
                              background: 'var(--color-brand-blue)',
                              borderRadius: '2px 2px 0 0',
                              transition: 'height var(--transition-fast)',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {metrics.dailyActivity.map((day) => (
                      <span key={day.date} style={{ textAlign: 'center', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {day.date.slice(5)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <table style={{ width: '100%', fontSize: '0.78rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <th style={{ padding: '4px' }}>Date</th>
                      <th style={{ padding: '4px' }}>Journeys</th>
                      <th style={{ padding: '4px' }}>Distance</th>
                      <th style={{ padding: '4px' }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.dailyActivity.map((day) => (
                      <tr key={day.date} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <td style={{ padding: '4px' }}>{day.date}</td>
                        <td style={{ padding: '4px' }}>{day.count}</td>
                        <td style={{ padding: '4px' }}>{day.distance_km} km</td>
                        <td style={{ padding: '4px' }}>{day.duration_minutes} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionPanel>

            {/* Chart 2: Journey Duration Distribution */}
            <SectionPanel
              title="Duration Distribution"
              badge="COMPLETED COMMUTES"
              badgeVariant="neutral"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                {metrics.durationDistribution.map((item) => {
                  const maxB = Math.max(...metrics.durationDistribution.map((d) => d.count), 1);
                  const pct = Math.round((item.count / maxB) * 100);
                  return (
                    <div key={item.bucket} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{item.label}</span>
                        <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{item.count}</span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          background: 'var(--color-surface-panel)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: '#10b981',
                            borderRadius: '4px',
                            transition: 'width var(--transition-fast)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionPanel>

            {/* Chart 3: Route-Type Usage Breakdown */}
            <SectionPanel
              title="Route-Type Usage"
              badge={`${metrics.totalJourneys} RECORDED`}
              badgeVariant="neutral"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-1)' }}>
                {/* Visual Proportion Bar */}
                <div
                  style={{
                    height: '12px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    display: 'flex',
                    background: 'var(--color-surface-panel)',
                  }}
                >
                  {metrics.totalJourneys > 0 && (
                    <>
                      <div
                        style={{
                          width: `${(metrics.routeTypeBreakdown.FASTEST / metrics.totalJourneys) * 100}%`,
                          background: '#38bdf8',
                        }}
                        title={`Fastest: ${metrics.routeTypeBreakdown.FASTEST}`}
                      />
                      <div
                        style={{
                          width: `${(metrics.routeTypeBreakdown.BALANCED / metrics.totalJourneys) * 100}%`,
                          background: '#34d399',
                        }}
                        title={`Balanced: ${metrics.routeTypeBreakdown.BALANCED}`}
                      />
                      <div
                        style={{
                          width: `${(metrics.routeTypeBreakdown.SAFEST / metrics.totalJourneys) * 100}%`,
                          background: '#a78bfa',
                        }}
                        title={`Safest: ${metrics.routeTypeBreakdown.SAFEST}`}
                      />
                    </>
                  )}
                </div>

                {/* Key Labels */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)', textAlign: 'center' }}>
                  <div style={{ background: 'var(--color-surface-card)', padding: 'var(--space-2)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>⚡ FASTEST</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      {metrics.routeTypeBreakdown.FASTEST}
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-surface-card)', padding: 'var(--space-2)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>⚖️ BALANCED</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      {metrics.routeTypeBreakdown.BALANCED}
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-surface-card)', padding: 'var(--space-2)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 700 }}>🛡️ SAFEST</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      {metrics.routeTypeBreakdown.SAFEST}
                    </div>
                  </div>
                </div>
              </div>
            </SectionPanel>

            {/* Chart 4: Journey Completion Status */}
            <SectionPanel
              title="Journey Completion Status"
              badge={`${metrics.totalJourneys} TRIPS`}
              badgeVariant="neutral"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                      Trip Completion Rate
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                      {metrics.totalJourneys > 0
                        ? `${Math.round((metrics.completedJourneys / metrics.totalJourneys) * 100)}%`
                        : '0%'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                      ✔ {metrics.completedJourneys} Completed
                    </div>
                    {metrics.cancelledJourneys > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>
                        ✖ {metrics.cancelledJourneys} Cancelled
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  Cancelled journeys are recorded for auditability but are strictly barred from travel distance or time totals.
                </div>
              </div>
            </SectionPanel>
          </div>

          {/* 5. Recent Journeys Table */}
          <SectionPanel
            title="Recent Journey Records"
            badge={`${metrics.records.length} SHOWN`}
            badgeVariant="info"
          >
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  minWidth: '600px',
                  fontSize: '0.82rem',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border-medium)', background: 'var(--color-surface-elevated)' }}>
                    <th style={{ padding: 'var(--space-3)' }}>Origin & Destination</th>
                    <th style={{ padding: 'var(--space-3)' }}>Date / Time</th>
                    <th style={{ padding: 'var(--space-3)' }}>Strategy</th>
                    <th style={{ padding: 'var(--space-3)' }}>Duration / Dist.</th>
                    <th style={{ padding: 'var(--space-3)' }}>Safety / Conf.</th>
                    <th style={{ padding: 'var(--space-3)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.records.slice(0, 15).map((r) => (
                    <tr
                      key={r.journey_id}
                      style={{
                        borderBottom: '1px solid var(--color-border-subtle)',
                        background: r.is_demo ? 'rgba(251, 191, 36, 0.03)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {formatLocation(r.origin)} → {formatLocation(r.destination)}
                        </div>
                        {r.is_demo && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              color: '#fbbf24',
                              background: 'rgba(251, 191, 36, 0.12)',
                              padding: '1px 5px',
                              borderRadius: 'var(--radius-xs)',
                              display: 'inline-block',
                              marginTop: '2px',
                            }}
                          >
                            DEMO SEEDED RECORD
                          </span>
                        )}
                      </td>

                      <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        <div>{r.date_ymd}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          {r.start_time_ist?.slice(11, 16) || 'IST'}
                        </div>
                      </td>

                      <td style={{ padding: 'var(--space-3)' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-xs)',
                            background:
                              r.route_type === 'SAFEST'
                                ? 'rgba(167, 139, 250, 0.15)'
                                : r.route_type === 'FASTEST'
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'rgba(52, 211, 153, 0.15)',
                            color:
                              r.route_type === 'SAFEST'
                                ? '#a78bfa'
                                : r.route_type === 'FASTEST'
                                ? '#38bdf8'
                                : '#34d399',
                          }}
                        >
                          {r.route_type}
                        </span>
                      </td>

                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {r.status === 'COMPLETED' ? `${Math.round(r.duration_minutes)}m` : 'Terminated'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          {r.distance_km} km
                        </div>
                      </td>

                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-risk-low-text)' }}>
                            {r.safety_score != null ? r.safety_score.toFixed(1) : '—'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-confidence-text)' }}>
                            ({r.confidence_score != null ? `${Math.round(r.confidence_score)}%` : '—'})
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: 'var(--space-3)' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-xs)',
                            background: r.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: r.status === 'COMPLETED' ? '#10b981' : '#ef4444',
                          }}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionPanel>
        </>
      )}
    </div>
  );
}

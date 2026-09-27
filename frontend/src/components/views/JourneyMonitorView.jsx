import React from 'react';
import { PageHeader } from '../common/PageHeader';
import { JourneyMonitoringWorkspace } from '../journey/JourneyMonitoringWorkspace';
import { NAV_TABS } from '../../utils/constants';

/**
 * JourneyMonitorView Component (Phase 14).
 * Dedicated workspace view for real-time journey monitoring, check-ins, and SOS safety tools.
 */
export function JourneyMonitorView({
  selectedRoute = null,
  onNavigate = null,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        title="Safety Check-In & Journey Monitoring"
        subtitle="Opt-in periodic safety check-ins, live journey timer, verified emergency helplines, and deliberate in-app SOS."
        badge="PHASE 14 • REAL-TIME SAFETY"
        action={
          onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(NAV_TABS.PLAN_ROUTE)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              🗺️ Plan Another Route
            </button>
          )
        }
      />

      {/* Main Monitoring Workspace */}
      <JourneyMonitoringWorkspace
        activeRoute={selectedRoute}
        onNavigateToPlanner={() => onNavigate && onNavigate(NAV_TABS.PLAN_ROUTE)}
      />
    </div>
  );
}

import React, { useState } from 'react';
import { PageHeader } from '../common/PageHeader';
import { JourneyInsightsDashboard } from '../analytics/JourneyInsightsDashboard';
import { RouteSafetyAnalyticsView } from '../analytics/RouteSafetyAnalyticsView';
import { EvidenceCoverageExplorer } from '../analytics/EvidenceCoverageExplorer';
import { PersonalizedPreferencesPanel } from '../analytics/PersonalizedPreferencesPanel';
import { NAV_TABS } from '../../utils/constants';

/**
 * JourneyInsightsView Component (Phase 15 Master View).
 * Unifies commuter journey insights, transparent safety analytics,
 * evidence coverage explorer, and personalized route preferences.
 */
export function JourneyInsightsView({ onNavigate = null, activeRoutes = [] }) {
  const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'route_analytics' | 'evidence' | 'preferences'

  const tabs = [
    { id: 'insights', label: '📊 Journey Insights', desc: 'Recorded journeys & metrics' },
    { id: 'route_analytics', label: '🛡️ Safety Analytics', desc: 'Route comparison & trade-offs' },
    { id: 'evidence', label: '🔍 Evidence & Uncertainty', desc: 'Coverage & freshness' },
    { id: 'preferences', label: '⚙️ Route Preferences', desc: 'Speed vs safety settings' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PageHeader
        title="Journey Insights & Safety Analytics"
        subtitle="Transparent evaluation of recorded journeys, route alternatives, and personalized speed vs. safety preferences for Chennai."
      />

      {/* Sub-Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Insights and preferences subtabs"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          borderBottom: '1px solid var(--color-border-subtle)',
          paddingBottom: 'var(--space-2)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: isActive ? 'var(--color-surface-elevated)' : 'var(--color-surface-card)',
                color: isActive ? 'var(--color-brand-blue)' : 'var(--color-text-secondary)',
                border: isActive ? '1px solid var(--color-brand-blue)' : '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-2) var(--space-4)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      <div role="tabpanel">
        {activeTab === 'insights' && (
          <JourneyInsightsDashboard
            onNavigateToPlanner={() => onNavigate && onNavigate(NAV_TABS.PLAN_ROUTE)}
          />
        )}

        {activeTab === 'route_analytics' && (
          <RouteSafetyAnalyticsView
            routes={activeRoutes}
            onSelectRoute={() => {
              if (onNavigate) onNavigate(NAV_TABS.PLAN_ROUTE);
            }}
          />
        )}

        {activeTab === 'evidence' && (
          <EvidenceCoverageExplorer />
        )}

        {activeTab === 'preferences' && (
          <PersonalizedPreferencesPanel />
        )}
      </div>
    </div>
  );
}

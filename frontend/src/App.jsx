import React, { useState, useEffect } from 'react';
import { AppShell } from './components/shell/AppShell';
import { HomeView } from './components/views/HomeView';
import { PlanRouteView } from './components/views/PlanRouteView';
import { EvidenceView } from './components/views/EvidenceView';
import { CommunityView } from './components/views/CommunityView';
import { ActivityView } from './components/views/ActivityView';
import { JourneyMonitorView } from './components/views/JourneyMonitorView';
import { JourneyInsightsView } from './components/views/JourneyInsightsView';
import { fetchSystemHealth } from './api/health';
import { NAV_TABS } from './utils/constants';

export default function App() {
  const [activeTab, setActiveTab] = useState(NAV_TABS.HOME);
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);
  const [monitoredRoute, setMonitoredRoute] = useState(null);
  const [plannedRoutes, setPlannedRoutes] = useState([]);

  // Journey state preserved across navigation between tabs
  const [journeyState, setJourneyState] = useState({
    origin: 'Chennai Central Railway Station',
    destination: 'T. Nagar Bus Terminus',
    journeyDate: new Date().toISOString().split('T')[0],
    departureTime: '21:30',
    routePreference: 'BALANCED',
    safetyWeight: 0.5,
  });

  const handleUpdateJourneyState = (updates) => {
    setJourneyState((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleStartMonitoring = (route) => {
    setMonitoredRoute(route);
    setActiveTab(NAV_TABS.MONITOR);
  };

  const checkHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const data = await fetchSystemHealth();
      setHealthData(data);
    } catch (err) {
      setHealthError(err.message);
      setHealthData(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSelectPreset = (preset) => {
    setJourneyState((prev) => ({
      ...prev,
      origin: preset.origin,
      destination: preset.destination,
    }));
    setActiveTab(NAV_TABS.PLAN_ROUTE);
  };

  const renderView = () => {
    switch (activeTab) {
      case NAV_TABS.HOME:
        return (
          <HomeView
            onNavigate={setActiveTab}
            onSelectPreset={handleSelectPreset}
          />
        );
      case NAV_TABS.PLAN_ROUTE:
        return (
          <PlanRouteView
            journeyState={journeyState}
            onUpdateJourneyState={handleUpdateJourneyState}
            onNavigate={setActiveTab}
            onStartMonitoring={handleStartMonitoring}
            onRoutesCalculated={setPlannedRoutes}
          />
        );
      case NAV_TABS.MONITOR:
        return (
          <JourneyMonitorView
            selectedRoute={monitoredRoute}
            onNavigate={setActiveTab}
          />
        );
      case NAV_TABS.INSIGHTS:
        return (
          <JourneyInsightsView
            onNavigate={setActiveTab}
            activeRoutes={plannedRoutes}
          />
        );
      case NAV_TABS.EVIDENCE:
        return <EvidenceView />;
      case NAV_TABS.COMMUNITY:
        return <CommunityView />;
      case NAV_TABS.ACTIVITY:
        return <ActivityView />;
      default:
        return (
          <HomeView
            onNavigate={setActiveTab}
            onSelectPreset={handleSelectPreset}
          />
        );
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      healthData={healthData}
      healthLoading={healthLoading}
      healthError={healthError}
      onRefreshHealth={checkHealth}
    >
      {renderView()}
    </AppShell>
  );
}

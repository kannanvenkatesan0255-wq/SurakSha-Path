import React, { useState, useEffect } from 'react';
import { AppShell } from './components/shell/AppShell';
import { HomeView } from './components/views/HomeView';
import { PlanRouteView } from './components/views/PlanRouteView';
import { EvidenceView } from './components/views/EvidenceView';
import { CommunityView } from './components/views/CommunityView';
import { ActivityView } from './components/views/ActivityView';
import { fetchSystemHealth } from './api/health';
import { NAV_TABS } from './utils/constants';

export default function App() {
  const [activeTab, setActiveTab] = useState(NAV_TABS.HOME);
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);

  // Active preset state passed between Home and PlanRoute views
  const [selectedPreset, setSelectedPreset] = useState(null);

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
    setSelectedPreset(preset);
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
            initialOrigin={selectedPreset ? selectedPreset.origin : 'Chennai Central Railway Station'}
            initialDestination={selectedPreset ? selectedPreset.destination : 'T. Nagar Bus Terminus'}
            initialCorridor={selectedPreset ? selectedPreset.corridor : 'Anna Salai Corridor'}
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

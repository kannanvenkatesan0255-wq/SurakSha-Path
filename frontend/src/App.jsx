import React, { useState } from 'react';
import { Header } from './components/shell/Header';
import { Navigation } from './components/shell/Navigation';
import { ServiceStatusBar } from './components/shell/ServiceStatusBar';
import { Footer } from './components/shell/Footer';
import { HomeView } from './components/views/HomeView';
import { PlanRouteView } from './components/views/PlanRouteView';
import { RouteResultsView } from './components/views/RouteResultsView';
import { EvidenceView } from './components/views/EvidenceView';
import { CommunityView } from './components/views/CommunityView';
import { ActivityView } from './components/views/ActivityView';
import { NAV_TABS } from './utils/constants';

export default function App() {
  const [activeTab, setActiveTab] = useState(NAV_TABS.HOME);

  const renderActiveView = () => {
    switch (activeTab) {
      case NAV_TABS.HOME:
        return <HomeView onNavigate={setActiveTab} />;
      case NAV_TABS.PLAN_ROUTE:
        return <PlanRouteView />;
      case NAV_TABS.ROUTE_RESULTS:
        return <RouteResultsView />;
      case NAV_TABS.EVIDENCE:
        return <EvidenceView />;
      case NAV_TABS.COMMUNITY:
        return <CommunityView />;
      case NAV_TABS.ACTIVITY:
        return <ActivityView />;
      default:
        return <HomeView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <ServiceStatusBar />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main style={{
        flex: 1,
        maxWidth: 'var(--max-content-width)',
        width: '100%',
        margin: '0 auto',
        padding: '2rem',
      }}>
        {renderActiveView()}
      </main>

      <Footer />
    </div>
  );
}

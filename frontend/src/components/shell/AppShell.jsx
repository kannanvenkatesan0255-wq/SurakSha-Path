import React, { useState } from 'react';
import { AppHeader } from './AppHeader';
import { PrimaryNavigation } from './PrimaryNavigation';
import { Footer } from './Footer';

/**
 * AppShell component.
 * Coordinates global top bar, primary navigation, workspace viewport, and footer.
 */
export function AppShell({
  activeTab,
  onTabChange,
  healthData,
  healthLoading,
  healthError,
  onRefreshHealth,
  children,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--color-surface-base)',
      }}
    >
      {/* Top Application Header */}
      <AppHeader
        healthData={healthData}
        healthLoading={healthLoading}
        healthError={healthError}
        onRefreshHealth={onRefreshHealth}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Layout Area: Navigation Sidebar + Workspace Content */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
        }}
      >
        {/* Primary Navigation Sidebar */}
        <PrimaryNavigation
          activeTab={activeTab}
          onTabChange={onTabChange}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Workspace Container */}
        <main
          id="main-content"
          role="main"
          style={{
            flex: 1,
            padding: 'var(--space-6)',
            overflowY: 'auto',
            maxWidth: 'calc(var(--max-content-width) + var(--sidebar-width))',
            margin: '0 auto',
            width: '100%',
          }}
        >
          {children}
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

import React, { useState } from 'react';
import { AppHeader } from './AppHeader';
import { PrimaryNavigation } from './PrimaryNavigation';
import { MobileBottomNav } from './MobileBottomNav';
import { EmergencyHelplineModal } from '../common/EmergencyHelplineModal';
import { Footer } from './Footer';

/**
 * AppShell component.
 * Coordinates global top bar, primary navigation, workspace viewport, mobile bottom nav, and footer.
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
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);

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
        onOpenSosModal={() => setIsSosModalOpen(true)}
      />

      {/* Main Layout Area: Navigation Sidebar + Workspace Content */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          minWidth: 0,
        }}
      >
        {/* Primary Navigation Sidebar (Desktop) / Slide-in Drawer (Mobile) */}
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
          className="app-main-content"
          style={{
            flex: 1,
            minWidth: 0,
            padding: 'var(--space-6)',
            overflowY: 'auto',
            maxWidth: 'calc(var(--max-content-width) + var(--sidebar-width))',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </main>
      </div>

      {/* Responsive Mobile Bottom Navigation Bar (Handheld devices <= 768px) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenSosModal={() => setIsSosModalOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Universal Emergency SOS Helpline Modal */}
      <EmergencyHelplineModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
      />

      {/* Footer */}
      <Footer />

      <style>{`
        @media (max-width: 768px) {
          .app-main-content {
            padding: var(--space-3) !important;
            padding-bottom: calc(72px + env(safe-area-inset-bottom, 12px)) !important;
          }
        }
      `}</style>
    </div>
  );
}


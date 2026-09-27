import React, { useState } from 'react';
import { PageHeader } from '../common/PageHeader';
import { SectionPanel } from '../common/SectionPanel';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { ErrorState } from '../common/ErrorState';
import { LocationInputWithSuggestions } from '../planner/LocationInputWithSuggestions';
import { RoutePreferenceSelector } from '../planner/RoutePreferenceSelector';
import { JourneyDateTimeControls } from '../planner/JourneyDateTimeControls';
import { JourneyPlanResultCard } from '../planner/JourneyPlanResultCard';
import { RouteComparisonPanel } from '../routing/RouteComparisonPanel';
import { MapWorkspace } from '../map/MapWorkspace';
import { submitRoutePlan } from '../../api/routing';
import { swapLocations } from '../../services/locationService';
import { CHENNAI_PRESETS, NAV_TABS } from '../../utils/constants';

/**
 * PlanRouteView component.
 * Complete journey-planning interface implementing Phase 4 Journey Planner
 * and Phase 6 Route Engine & Alternative Route Generation.
 */
export function PlanRouteView({
  journeyState,
  onUpdateJourneyState,
  onNavigate,
}) {
  const {
    origin = '',
    destination = '',
    journeyDate = new Date().toISOString().split('T')[0],
    departureTime = '21:30',
    routePreference = 'BALANCED',
    safetyWeight = 0.5,
  } = journeyState || {};

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResponse, setSubmissionResponse] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  // Validation function
  const validateForm = () => {
    const errors = {};
    const origTrim = (origin || '').trim();
    const destTrim = (destination || '').trim();

    if (!origTrim) {
      errors.origin = 'Origin location is required.';
    } else if (origTrim.length < 2) {
      errors.origin = 'Please enter at least 2 characters for the origin.';
    }

    if (!destTrim) {
      errors.destination = 'Destination location is required.';
    } else if (destTrim.length < 2) {
      errors.destination = 'Please enter at least 2 characters for the destination.';
    }

    if (origTrim && destTrim && origTrim.toLowerCase() === destTrim.toLowerCase()) {
      errors.destination = 'Destination cannot be identical to the origin location.';
    }

    if (journeyDate) {
      const today = new Date().toISOString().split('T')[0];
      if (journeyDate < today) {
        errors.journeyDate = 'Journey date cannot be in the past.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Swap origin and destination
  const handleSwap = () => {
    const { swappedOrigin, swappedDestination } = swapLocations(origin, destination);
    onUpdateJourneyState({
      origin: swappedOrigin,
      destination: swappedDestination,
    });
    setRoutes([]);
    setSelectedRouteId(null);
    setSubmissionResponse(null);
    // Clear cross-field identical errors on swap
    if (formErrors.destination || formErrors.origin) {
      setFormErrors({});
    }
  };

  // Select alternative route
  const handleSelectRoute = (routeId) => {
    setSelectedRouteId(routeId);
    setRoutes((prevRoutes) =>
      prevRoutes.map((r) => ({
        ...r,
        is_selected: r.route_id === routeId,
      }))
    );
  };

  // Clear current route alternatives
  const handleClearRoutes = () => {
    setRoutes([]);
    setSelectedRouteId(null);
    setSubmissionResponse(null);
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const response = await submitRoutePlan({
        originName: origin,
        destinationName: destination,
        journeyDate,
        departureTime,
        routePreference,
        safetyWeightPreference: safetyWeight,
        avoidUnlitAreas: true,
      });

      setSubmissionResponse(response);
      if (response && response.alternatives && response.alternatives.length > 0) {
        setRoutes(response.alternatives);
        const initialSelected =
          response.selected_route_id ||
          response.alternatives.find((r) => r.is_selected)?.route_id ||
          response.alternatives[0].route_id;
        setSelectedRouteId(initialSelected);
      } else {
        setRoutes([]);
        setSelectedRouteId(null);
      }
    } catch (err) {
      setSubmissionError(
        err.message || 'Unable to submit route planning request to the backend service.'
      );
      setRoutes([]);
      setSelectedRouteId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyPreset = (preset) => {
    onUpdateJourneyState({
      origin: preset.origin,
      destination: preset.destination,
    });
    setFormErrors({});
    setSubmissionResponse(null);
    setSubmissionError(null);
    setRoutes([]);
    setSelectedRouteId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header (Task 2A) */}
      <PageHeader
        title="Plan Your Journey"
        description="Choose where you're travelling from and to, then compare route options using travel time and available safety evidence."
        badge={<StatusBadge label="PHASE 6 ROUTE ENGINE" variant="info" />}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => onNavigate && onNavigate(NAV_TABS.HOME)}
              icon="←"
              ariaLabel="Return to Home overview"
            >
              Return to Home
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleApplyPreset(CHENNAI_PRESETS[0])}
            >
              Preset: Central ➔ T. Nagar
            </Button>
          </div>
        }
      />

      {/* Contextual Information Banner (Task 2C) */}
      <div
        style={{
          background: 'var(--color-surface-panel)',
          borderLeft: '3px solid var(--color-brand-cyan)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-xs)',
          fontSize: '0.82rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--color-text-primary)' }}>Contextual Information: </strong>
        Suraksha Path compares routes using available evidence and journey context.
        Assessments depend on the coverage, quality, and freshness of the available data.
      </div>

      {/* Main Two-Column Layout */}
      <div
        className="planner-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(380px, 460px) 1fr',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Journey Form or Validation Result Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {submissionResponse ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Result Confirmation Card */}
              <JourneyPlanResultCard
                response={submissionResponse}
                onReset={() => {
                  setSubmissionResponse(null);
                  setRoutes([]);
                  setSelectedRouteId(null);
                }}
                onViewEvidence={() => onNavigate && onNavigate(NAV_TABS.EVIDENCE)}
              />

              {/* Calculated Route Alternatives Comparison Panel (Phase 6) */}
              {routes && routes.length > 0 && (
                <RouteComparisonPanel
                  routes={routes}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={handleSelectRoute}
                  onClearRoutes={handleClearRoutes}
                />
              )}
            </div>
          ) : (
            /* Journey Planning Form (Task 2B) */
            <SectionPanel
              title="Journey Configuration"
              subtitle="Enter origin and destination points within Chennai"
            >
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Location Inputs with Swap Button (Task 3) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', position: 'relative' }}>
                  <LocationInputWithSuggestions
                    label="Origin Location"
                    id="planner-origin"
                    icon="📍"
                    value={origin}
                    onChange={(val) => {
                      onUpdateJourneyState({ origin: val });
                      if (routes.length > 0) {
                        setRoutes([]);
                        setSelectedRouteId(null);
                      }
                    }}
                    placeholder="e.g. Chennai Central Railway Station"
                    error={formErrors.origin}
                    helperText="Enter a Chennai station, neighbourhood, or landmark"
                    required
                  />

                  {/* Swap Button Action */}
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
                    <button
                      type="button"
                      onClick={handleSwap}
                      aria-label="Swap origin and destination locations"
                      title="Swap origin and destination"
                      style={{
                        background: 'var(--color-surface-card)',
                        border: '1px solid var(--color-border-medium)',
                        borderRadius: 'var(--radius-pill)',
                        padding: '4px 12px',
                        fontSize: '0.8rem',
                        color: 'var(--color-brand-cyan)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <span aria-hidden="true">⇅</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Swap Locations</span>
                    </button>
                  </div>

                  <LocationInputWithSuggestions
                    label="Destination Location"
                    id="planner-destination"
                    icon="🏁"
                    value={destination}
                    onChange={(val) => {
                      onUpdateJourneyState({ destination: val });
                      if (routes.length > 0) {
                        setRoutes([]);
                        setSelectedRouteId(null);
                      }
                    }}
                    placeholder="e.g. T. Nagar Bus Terminus"
                    error={formErrors.destination}
                    helperText="Enter your target destination in Chennai"
                    required
                  />
                </div>

                {/* Journey Date & Time Controls (Task 5) */}
                <JourneyDateTimeControls
                  dateValue={journeyDate}
                  onDateChange={(val) => onUpdateJourneyState({ journeyDate: val })}
                  timeValue={departureTime}
                  onTimeChange={(val) => onUpdateJourneyState({ departureTime: val })}
                  dateError={formErrors.journeyDate}
                />

                {/* Safety–Time Preference Selector (Task 6) */}
                <RoutePreferenceSelector
                  value={routePreference}
                  onChange={(val) => onUpdateJourneyState({ routePreference: val })}
                />

                {/* Submission Error Banner if any */}
                {submissionError && (
                  <ErrorState
                    title="Submission Failed"
                    message={submissionError}
                    retryAction={handleSubmit}
                    retryLabel="Retry Submission"
                  />
                )}

                {/* Submit Action */}
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  icon="⚡"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                >
                  {isSubmitting ? 'Validating Journey...' : 'Plan Journey'}
                </Button>
              </form>
            </SectionPanel>
          )}

          {/* Preset Quick Selectors */}
          <SectionPanel
            title="Chennai Corridor Presets"
            subtitle="Quick-fill origins and destinations for testing"
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              {CHENNAI_PRESETS.slice(0, 4).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    textAlign: 'left',
                    fontSize: '0.74rem',
                    padding: 'var(--space-2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    height: 'auto',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{preset.name.split('➔')[0]} ➔</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{preset.name.split('➔')[1]}</span>
                </button>
              ))}
            </div>
          </SectionPanel>
        </div>

        {/* Right Column: Cartographic Workspace Viewport (Task 10) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minHeight: '600px' }}>
          <MapWorkspace
            origin={origin}
            destination={destination}
            activeCorridor="Chennai Demonstration Corridor"
            selectedRouteType={routePreference}
            routes={routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={handleSelectRoute}
            onSelectOrigin={(loc) => {
              onUpdateJourneyState({ origin: loc.name });
              setRoutes([]);
              setSelectedRouteId(null);
            }}
            onSelectDestination={(loc) => {
              onUpdateJourneyState({ destination: loc.name });
              setRoutes([]);
              setSelectedRouteId(null);
            }}
            onClearOrigin={() => {
              onUpdateJourneyState({ origin: '' });
              setRoutes([]);
              setSelectedRouteId(null);
            }}
            onClearDestination={() => {
              onUpdateJourneyState({ destination: '' });
              setRoutes([]);
              setSelectedRouteId(null);
            }}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .planner-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

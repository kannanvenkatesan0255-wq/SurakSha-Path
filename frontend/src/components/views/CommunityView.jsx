import React, { useState } from 'react';
import { PageHeader } from '../common/PageHeader';
import { SectionPanel } from '../common/SectionPanel';
import { StatusBadge } from '../common/StatusBadge';
import { RiskBadge } from '../common/RiskBadge';
import { Button } from '../common/Button';
import { TextInput, SelectInput } from '../common/Input';
import { FeedbackMessage } from '../common/FeedbackMessage';

/**
 * CommunityView component.
 * Demonstrates the Trust-Weighted Community Reporting framework and hazard taxonomy.
 */
export function CommunityView() {
  const [showReportForm, setShowReportForm] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState(null);

  const [category, setCategory] = useState('POOR_LIGHTING');
  const [locationName, setLocationName] = useState('Near Nandanam Signal, Anna Salai');
  const [description, setDescription] = useState('');

  const sampleReports = [
    {
      id: 'REP-401',
      category: 'POOR_LIGHTING',
      location: 'Anna Salai underpass stretch near Gemini Flyover',
      description: 'Three consecutive streetlamps flickering/unlit for the past 2 nights.',
      reportedAgo: '3 hours ago',
      confirmations: 4,
      reliabilityScore: 0.92,
      effectiveWeight: 0.88,
      status: 'CORROBORATED',
      riskImpact: 'MEDIUM',
    },
    {
      id: 'REP-402',
      category: 'POLICE_PATROL_ACTIVE',
      location: 'Sardar Patel Road near Guindy Metro',
      description: 'Stationary police patrol vehicle active with strobe lights at intersection.',
      reportedAgo: '45 mins ago',
      confirmations: 6,
      reliabilityScore: 0.95,
      effectiveWeight: 0.94,
      status: 'VERIFIED',
      riskImpact: 'LOW',
    },
    {
      id: 'REP-403',
      category: 'DESERTED_STRETCH',
      location: 'Rear access road behind T. Nagar South Usman corridor',
      description: 'Shops closed after 21:00; very low pedestrian footfall and unmonitored lane.',
      reportedAgo: '6 hours ago',
      confirmations: 2,
      reliabilityScore: 0.78,
      effectiveWeight: 0.65,
      status: 'UNVERIFIED',
      riskImpact: 'HIGH',
    },
  ];

  const handleFakeSubmit = (e) => {
    e.preventDefault();
    setSubmittedMessage('Report recorded in local demonstration queue. Trust-weight calculation calibrated.');
    setShowReportForm(false);
    setDescription('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        title="Trust-Weighted Community Intelligence"
        description="Crowd-sourced safety reporting calibrated by corroboration tallies, recency decay, and reporter reliability."
        badge={<StatusBadge label="PHASE 6 ROADMAP TARGET" variant="info" />}
        actions={
          <Button
            variant="primary"
            onClick={() => setShowReportForm(!showReportForm)}
            icon={showReportForm ? '✕' : '➕'}
          >
            {showReportForm ? 'Cancel Report' : 'Submit Safety Report'}
          </Button>
        }
      />

      {submittedMessage && (
        <FeedbackMessage type="success" onDismiss={() => setSubmittedMessage(null)}>
          {submittedMessage}
        </FeedbackMessage>
      )}

      {/* Report Submission Drawer / Panel */}
      {showReportForm && (
        <SectionPanel
          title="Submit a Road Safety Observation"
          subtitle="All reports are subject to trust weighting; unverified claims do not skew routing algorithms"
          badge={<StatusBadge label="DEMO SUBMISSION" variant="status" />}
        >
          <form onSubmit={handleFakeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <SelectInput
              label="Observation Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'POOR_LIGHTING', label: '💡 Poor or Broken Street Lighting' },
                { value: 'DESERTED_STRETCH', label: '👤 Deserted or Isolated Roadway' },
                { value: 'HARASSMENT_HAZARD', label: '⚠️ Threatening Loitering / Harassment Observed' },
                { value: 'ROAD_HAZARD', label: '🚧 Water-logging, Debris, or Construction Obstruction' },
                { value: 'POLICE_PATROL_ACTIVE', label: '👮 Active Police Presence / Patrol Sighting' },
              ]}
            />

            <TextInput
              label="Location in Chennai"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Anna Salai near Thousand Lights"
              required
            />

            <div>
              <label className="form-label">Detailed Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="form-input"
                placeholder="Describe specific observations (e.g. unlit lamps, construction barriers, presence of police booth)..."
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="secondary" onClick={() => setShowReportForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Record Observation
              </Button>
            </div>
          </form>
        </SectionPanel>
      )}

      {/* Trust Weighting Mathematical Formulation Panel */}
      <SectionPanel
        title="Trust-Weighting Algorithm"
        subtitle="Mathematical calibration preventing malicious or spam reporting"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-surface-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-brand-cyan)', textTransform: 'uppercase' }}>
              1. Reporter Reliability (R)
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              Tracks past verification consistency. Anonymous reports enter with a baseline multiplier of 0.70; repeated false flags drop below 0.20.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-risk-medium-text)', textTransform: 'uppercase' }}>
              2. Corroboration Tally (C)
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              Multiple independent reports from distinct commuters amplify evidence certainty without requiring centralized human intervention.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-confidence-text)', textTransform: 'uppercase' }}>
              3. Recency Time-Decay (T)
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              Exponential half-life decay function diminishes the impact of transient hazards over 24 to 72 hours as physical conditions change.
            </p>
          </div>
        </div>
      </SectionPanel>

      {/* Active Corroborated Reports Feed */}
      <SectionPanel
        title="Active Chennai Corridor Community Telemetry"
        subtitle="Recent community observations along tracked Chennai routes"
        badge={<StatusBadge label="CORROBORATED STREAM" variant="info" />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {sampleReports.map((report) => (
            <div
              key={report.id}
              style={{
                background: 'var(--color-surface-card)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-4)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: 'var(--space-3)',
              }}
            >
              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                    {report.id}
                  </span>
                  <StatusBadge
                    label={report.status}
                    variant={report.status === 'VERIFIED' ? 'info' : 'status'}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    • {report.reportedAgo}
                  </span>
                </div>

                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                  {report.location}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  {report.description}
                </p>
              </div>

              {/* Right: Trust Weight & Risk Pill */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
                <RiskBadge level={report.riskImpact} />
                <div
                  className="tabular-numbers"
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--color-brand-cyan)',
                    background: 'var(--color-surface-panel)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  Trust Weight: <strong>{report.effectiveWeight}</strong> ({report.confirmations} confirmations)
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}

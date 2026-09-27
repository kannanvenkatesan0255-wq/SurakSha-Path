import React, { useState, useEffect } from 'react';
import { PageHeader } from '../common/PageHeader';
import { SectionPanel } from '../common/SectionPanel';
import { StatusBadge } from '../common/StatusBadge';
import { RiskBadge } from '../common/RiskBadge';
import { Button } from '../common/Button';
import { TextInput, SelectInput } from '../common/Input';
import { FeedbackMessage } from '../common/FeedbackMessage';
import {
  fetchCommunityCategories,
  fetchCommunityReports,
  submitCommunityReport,
  confirmCommunityReport,
  disputeCommunityReport,
  flagCommunityReport,
} from '../../api/community';

const CHENNAI_QUICK_LANDMARKS = [
  { name: 'Anna Salai near Thousand Lights', lat: 13.0560, lng: 80.2530, segment: 'SEG-ANNA-001' },
  { name: 'Sardar Patel Road near Guindy Metro', lat: 13.0080, lng: 80.2140, segment: 'SEG-SPRD-001' },
  { name: 'OMR near TIDEL Park', lat: 12.9890, lng: 80.2490, segment: 'SEG-OMR-001' },
  { name: 'South Usman Road, T. Nagar', lat: 13.0380, lng: 80.2330, segment: 'SEG-TNAGAR-001' },
  { name: 'Marina Beach Light House / Kamarajar Salai', lat: 13.0400, lng: 80.2800, segment: 'SEG-MRNA-001' },
  { name: 'Velachery Vijayanagar Junction', lat: 12.9790, lng: 80.2190, segment: 'SEG-VEL-001' },
  { name: 'Chennai Central / Poonamallee High Road', lat: 13.0827, lng: 80.2707, segment: 'SEG-EVR-001' },
];

/**
 * CommunityView component (Phase 9).
 * Real-time, trust-weighted community reporting with independent corroborations,
 * recency decay, dispute handling, and dynamic road-segment reassessment.
 */
export function CommunityView() {
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
  const [expandedReportId, setExpandedReportId] = useState(null);

  // Form State
  const [formCategory, setFormCategory] = useState('POOR_LIGHTING');
  const [formLocation, setFormLocation] = useState(CHENNAI_QUICK_LANDMARKS[0].name);
  const [formLat, setFormLat] = useState(CHENNAI_QUICK_LANDMARKS[0].lat);
  const [formLng, setFormLng] = useState(CHENNAI_QUICK_LANDMARKS[0].lng);
  const [formSegment, setFormSegment] = useState(CHENNAI_QUICK_LANDMARKS[0].segment);
  const [formDescription, setFormDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback Messages
  const [feedback, setFeedback] = useState(null);

  // Anonymous Client User ID (stored in localStorage)
  const [userId, setUserId] = useState('anon_user');

  useEffect(() => {
    try {
      let storedId = localStorage.getItem('suraksha_client_user_id');
      if (!storedId) {
        storedId = `USER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        localStorage.setItem('suraksha_client_user_id', storedId);
      }
      setUserId(storedId);
    } catch {
      setUserId(`USER-${Date.now().toString(36).toUpperCase()}`);
    }
  }, []);

  // Load Categories & Reports on mount
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [catsRes, repRes] = await Promise.all([
        fetchCommunityCategories().catch(() => []),
        fetchCommunityReports({
          category: activeCategoryFilter === 'ALL' ? '' : activeCategoryFilter,
          status: activeStatusFilter === 'ALL' ? '' : activeStatusFilter,
          limit: 30,
        }).catch(() => ({ items: [] })),
      ]);

      if (Array.isArray(catsRes) && catsRes.length > 0) {
        setCategories(catsRes);
      }
      if (repRes && Array.isArray(repRes.items)) {
        setReports(repRes.items);
      }
    } catch (err) {
      console.warn('Failed to load community intelligence data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCategoryFilter, activeStatusFilter]);

  const handleLandmarkSelect = (e) => {
    const selected = CHENNAI_QUICK_LANDMARKS.find((lm) => lm.name === e.target.value);
    if (selected) {
      setFormLocation(selected.name);
      setFormLat(selected.lat);
      setFormLng(selected.lng);
      setFormSegment(selected.segment);
    } else {
      setFormLocation(e.target.value);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!formDescription || formDescription.trim().length < 10) {
      setFeedback({ type: 'error', message: 'Description must be at least 10 characters long.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        category: formCategory,
        description: formDescription.trim(),
        location_name: formLocation,
        latitude: parseFloat(formLat),
        longitude: parseFloat(formLng),
        segment_code: formSegment || null,
        observed_at: new Date().toISOString(),
      };

      const result = await submitCommunityReport(payload, userId);
      setFeedback({
        type: 'success',
        message: `Observation registered as ${result.report_id}! Trust weight calculated at ${(result.effective_trust_weight * 100).toFixed(0)}%. Road segment ${result.segment_code || 'corridor'} queued for dynamic reassessment.`,
      });
      setShowReportForm(false);
      setFormDescription('');
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit report. Please check required fields.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (reportId) => {
    try {
      const res = await confirmCommunityReport(reportId, userId);
      setFeedback({
        type: 'success',
        message: `Thank you! Your independent confirmation was recorded for ${reportId}. Trust weight updated to ${(res.effective_trust_weight * 100).toFixed(0)}%.`,
      });
      setReports((prev) => prev.map((r) => (r.report_id === reportId ? res : r)));
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Could not record confirmation.' });
    }
  };

  const handleDispute = async (reportId) => {
    try {
      const res = await disputeCommunityReport(reportId, userId, 'Disputed by community commuter');
      setFeedback({
        type: 'info',
        message: `Accuracy challenge logged for ${reportId}. Report weight penalized to ${(res.effective_trust_weight * 100).toFixed(0)}%.`,
      });
      setReports((prev) => prev.map((r) => (r.report_id === reportId ? res : r)));
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Could not submit dispute.' });
    }
  };

  const handleFlag = async (reportId) => {
    try {
      const res = await flagCommunityReport(reportId, userId, 'Flagged for moderation');
      setFeedback({
        type: 'info',
        message: `Report ${reportId} has been flagged for administrator inspection.`,
      });
      setReports((prev) => prev.map((r) => (r.report_id === reportId ? res : r)));
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Could not flag report.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        title="Trust-Weighted Community Intelligence"
        description="Crowd-sourced safety observations calibrated by independent corroborations, recency decay, and dispute penalties."
        badge={<StatusBadge label="PHASE 9 ACTIVE ENGINE" variant="info" />}
        actions={
          <Button
            variant="primary"
            onClick={() => setShowReportForm(!showReportForm)}
            icon={showReportForm ? '✕' : '➕'}
          >
            {showReportForm ? 'Cancel Report' : 'Submit Safety Observation'}
          </Button>
        }
      />

      {feedback && (
        <FeedbackMessage type={feedback.type} onDismiss={() => setFeedback(null)}>
          {feedback.message}
        </FeedbackMessage>
      )}

      {/* Report Submission Drawer / Panel */}
      {showReportForm && (
        <SectionPanel
          title="Submit a Road Safety Observation"
          subtitle="All reports are subject to trust weighting; unverified claims do not skew routing algorithms"
          badge={<StatusBadge label="TRUST-WEIGHTED SUBMISSION" variant="status" />}
        >
          <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <SelectInput
              label="Observation Category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              options={
                categories.length > 0
                  ? categories.map((c) => ({
                      value: c.category,
                      label: `${c.label} (${c.base_impact >= 0 ? '+' : ''}${c.base_impact} score impact)`,
                    }))
                  : [
                      { value: 'POOR_LIGHTING', label: '💡 Poor or Broken Street Lighting (-6.0 impact)' },
                      { value: 'DESERTED_STRETCH', label: '👤 Deserted or Isolated Roadway (-8.0 impact)' },
                      { value: 'OBSTRUCTED_FOOTPATH', label: '🚶 Obstructed or Missing Footpath (-4.0 impact)' },
                      { value: 'ISOLATED_UNDERPASS', label: '🚇 Isolated Underpass / Blindspot (-10.0 impact)' },
                      { value: 'SUSPICIOUS_LOITERING', label: '⚠️ Threatening Loitering / Harassment (-7.0 impact)' },
                      { value: 'ROAD_HAZARD', label: '🚧 Water-logging, Debris, or Construction (-5.0 impact)' },
                      { value: 'ACTIVE_POLICE_PRESENCE', label: '👮 Active Police Patrol / Sighting (+7.0 impact)' },
                      { value: 'HIGH_PEDESTRIAN_FOOTFALL', label: '👥 Active Nocturnal Commercial Footfall (+5.0 impact)' },
                      { value: 'INFRASTRUCTURE_DAMAGE', label: '🛠️ Damaged Roadway Infrastructure (-6.0 impact)' },
                    ]
              }
            />

            <div>
              <label className="form-label">Chennai Location / Landmark</label>
              <select
                className="form-input"
                value={formLocation}
                onChange={handleLandmarkSelect}
                style={{ marginBottom: '6px' }}
              >
                {CHENNAI_QUICK_LANDMARKS.map((lm) => (
                  <option key={lm.name} value={lm.name}>
                    {lm.name} ({lm.segment})
                  </option>
                ))}
              </select>
              <TextInput
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Or type a specific Chennai street or landmark..."
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <TextInput
                label="Latitude"
                type="number"
                step="0.0001"
                value={formLat}
                onChange={(e) => setFormLat(e.target.value)}
                required
              />
              <TextInput
                label="Longitude"
                type="number"
                step="0.0001"
                value={formLng}
                onChange={(e) => setFormLng(e.target.value)}
                required
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Detailed Observation Description</label>
                <span style={{ fontSize: '0.72rem', color: formDescription.length < 10 ? 'var(--color-risk-medium-text)' : 'var(--color-text-muted)' }}>
                  {formDescription.length} / 1000 chars (min 10)
                </span>
              </div>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="form-input"
                placeholder="Describe specific conditions observed (e.g. unlit lamps, construction debris, station patrol outpost, active storefronts)..."
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="secondary" onClick={() => setShowReportForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || formDescription.trim().length < 10}>
                {isSubmitting ? 'Recording...' : 'Record Observation'}
              </Button>
            </div>
          </form>
        </SectionPanel>
      )}

      {/* Trust Weighting Mathematical Formulation Panel */}
      <SectionPanel
        title="Trust-Weighting Algorithm"
        subtitle="Mathematical calibration preventing malicious reporting, spam bursts, or unverified score swings"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-surface-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-brand-cyan)', textTransform: 'uppercase' }}>
              1. Reporter Reliability (R)
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              Tracks past verification consistency. Verified contributors carry 0.95 multiplier; anonymous entries enter with baseline 0.75.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-risk-medium-text)', textTransform: 'uppercase' }}>
              2. Independent Corroboration (C)
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              Corroborations from distinct commuters amplify confidence (+15% each, capped at +60%). Single-user repeated entries are blocked.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-confidence-text)', textTransform: 'uppercase' }}>
              3. Recency Time-Decay (T)
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              Exponential half-life decay function diminishes the impact of transient hazards over 12 to 72 hours as conditions change.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-risk-high-text)', textTransform: 'uppercase' }}>
              4. Dispute Penalties (D)
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
              Community disputes apply immediate score dampening. Reports with more disputes than confirmations auto-shift to DISPUTED status.
            </p>
          </div>
        </div>
      </SectionPanel>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['ALL', 'POOR_LIGHTING', 'DESERTED_STRETCH', 'ACTIVE_POLICE_PRESENCE', 'ROAD_HAZARD'].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategoryFilter(c)}
              className={`btn ${activeCategoryFilter === c ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.74rem', padding: '3px 10px' }}
            >
              {c.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Status:</span>
          {['ALL', 'SUBMITTED', 'VERIFIED', 'DISPUTED'].map((s) => (
            <button
              key={s}
              onClick={() => setActiveStatusFilter(s)}
              className={`btn ${activeStatusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Active Corroborated Reports Feed */}
      <SectionPanel
        title={`Active Chennai Corridor Observations (${reports.length})`}
        subtitle="Recent community observations along tracked Chennai routes with trust weighting"
        badge={<StatusBadge label="VERIFICATION STREAM" variant="info" />}
      >
        {isLoading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading community observations...
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No community reports found matching current filters.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {reports.map((report) => {
              const isExpanded = expandedReportId === report.report_id;
              const impact = report.safety_score_impact || 0;
              const impactStr = impact >= 0 ? `+${impact.toFixed(1)} pts` : `${impact.toFixed(1)} pts`;
              const statusVariant =
                report.verification_status === 'VERIFIED'
                  ? 'info'
                  : report.verification_status === 'DISPUTED'
                  ? 'risk-medium'
                  : report.verification_status === 'UNDER_REVIEW'
                  ? 'confidence'
                  : 'status';

              const riskReduction = impact >= 2.0 ? 'LOW' : impact >= -2.0 ? 'MEDIUM' : 'HIGH';

              return (
                <div
                  key={report.report_id}
                  style={{
                    background: 'var(--color-surface-card)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-brand-cyan)' }}>
                          {report.report_id}
                        </span>
                        <StatusBadge label={report.verification_status} variant={statusVariant} />
                        {report.is_synthetic && (
                          <span
                            className="badge badge-status"
                            style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' }}
                          >
                            SYNTHETIC DEMO
                          </span>
                        )}
                        {report.segment_code && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            • {report.segment_code}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {report.location_name || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        Category: <strong>{report.category_label || report.category}</strong> • Reporter: {report.reporter_display}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <RiskBadge level={riskReduction} />
                      <div
                        className="tabular-numbers"
                        style={{
                          fontSize: '0.74rem',
                          color: impact >= 0 ? 'var(--color-risk-low-text)' : 'var(--color-risk-high-text)',
                          background: 'var(--color-surface-panel)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--color-border-subtle)',
                        }}
                      >
                        Impact: <strong>{impactStr}</strong> (W: {(report.effective_trust_weight * 100).toFixed(0)}%)
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 'var(--space-1) 0', lineHeight: 1.45 }}>
                    {report.description}
                  </p>

                  {/* Actions & Interactions Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleConfirm(report.report_id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Corroborate that you have also observed this condition"
                      >
                        <span>👍</span> Confirm ({report.confirmation_count})
                      </button>
                      <button
                        onClick={() => handleDispute(report.report_id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Contest accuracy or report condition resolved"
                      >
                        <span>⚠️</span> Dispute ({report.dispute_count})
                      </button>
                      <button
                        onClick={() => handleFlag(report.report_id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Flag for moderator inspection"
                      >
                        <span>🚩</span> Flag ({report.flag_count})
                      </button>
                    </div>

                    <button
                      onClick={() => setExpandedReportId(isExpanded ? null : report.report_id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', color: 'var(--color-brand-cyan)' }}
                    >
                      {isExpanded ? 'Hide Mathematical Breakdown ▲' : 'How this contributes ▼'}
                    </button>
                  </div>

                  {/* Explainability Breakdown (How this contributes) */}
                  {isExpanded && report.how_this_contributes && (
                    <div
                      style={{
                        background: 'var(--color-surface-panel)',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-xs)',
                        borderLeft: '3px solid var(--color-brand-cyan)',
                        fontSize: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        marginTop: 'var(--space-1)',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {report.how_this_contributes.summary}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', marginTop: '4px' }}>
                        <div>Reliability Multiplier (R): <strong>{report.how_this_contributes.factors?.reporter_reliability}</strong></div>
                        <div>Corroboration Factor (C): <strong>{report.how_this_contributes.factors?.corroboration_factor}</strong> ({report.confirmation_count} confirms)</div>
                        <div>Recency Time-Decay (T): <strong>{report.how_this_contributes.factors?.recency_decay}</strong> ({report.how_this_contributes.factors?.hours_since_observation}h old)</div>
                        <div>Verification Status (V): <strong>{report.how_this_contributes.factors?.verification_multiplier}</strong> ({report.verification_status})</div>
                        <div>Dispute Factor (D): <strong>{report.how_this_contributes.factors?.dispute_penalty}</strong> ({report.dispute_count} disputes)</div>
                        <div>Effective Trust Weight (W): <strong style={{ color: 'var(--color-brand-cyan)' }}>{report.how_this_contributes.factors?.effective_trust_weight}</strong></div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        {report.how_this_contributes.caution_note}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionPanel>

      {/* Methodological Transparency Note */}
      <div
        style={{
          background: 'var(--color-surface-panel)',
          borderLeft: '3px solid var(--color-brand-blue)',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-xs)',
          fontSize: '0.82rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--color-text-primary)' }}>Community Trust & Safety Principle: </strong>
        Suraksha Path distinguishes verified physical datasets from community reports. Uncorroborated reports never dominate route risk scores. Absence of reports is NEVER interpreted as proof of safety.
      </div>
    </div>
  );
}

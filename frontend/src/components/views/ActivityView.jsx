import React, { useState, useEffect } from 'react';
import { PageHeader } from '../common/PageHeader';
import { SectionPanel } from '../common/SectionPanel';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { TextInput, SelectInput } from '../common/Input';
import { FeedbackMessage } from '../common/FeedbackMessage';
import {
  fetchFeedbackTypes,
  submitFeedback,
  fetchFeedbackList,
  fetchReassessmentAuditLog,
  reviewFeedback,
  reassessSegment,
} from '../../api/feedback';

/**
 * ActivityView component (Phase 12).
 * Continuous feedback-driven reassessment, audit log ledger,
 * moderation review, and closed-loop model recalibration workspace.
 */
export function ActivityView() {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit', 'audit_log', 'ledger', 'moderation', 'governance'

  // Metadata & Catalogs
  const [feedbackTypes, setFeedbackTypes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Submission Form State
  const [selectedType, setSelectedType] = useState('INFRASTRUCTURE_ISSUE');
  const [operationalIntent, setOperationalIntent] = useState('NEW_OBSERVATION');
  const [targetType, setTargetType] = useState('SEGMENT');
  const [targetSegmentCode, setTargetSegmentCode] = useState('SEG-ANNA-SALAI-04');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('Mount Road / Nandanam Corridor, Chennai');
  const [latitude, setLatitude] = useState(13.0285);
  const [longitude, setLongitude] = useState(80.2392);
  const [reporterId, setReporterId] = useState('chennai_commuter_77');
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Moderation Console State
  const [moderatorId, setModeratorId] = useState('mod_chennai_ops');
  const [moderatorKey, setModeratorKey] = useState('suraksha-chennai-moderator-2026');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [moderationResult, setModerationResult] = useState(null);

  // Audit Log Filter State
  const [auditFilterSegment, setAuditFilterSegment] = useState('');

  // Initial Data Fetching
  const loadWorkspaceData = async () => {
    setLoadingData(true);
    try {
      const [types, logs, items] = await Promise.allSettled([
        fetchFeedbackTypes(),
        fetchReassessmentAuditLog({ limit: 30 }),
        fetchFeedbackList({ limit: 30 }),
      ]);

      if (types.status === 'fulfilled' && Array.isArray(types.value)) {
        setFeedbackTypes(types.value);
      }
      if (logs.status === 'fulfilled' && Array.isArray(logs.value)) {
        setAuditLogs(logs.value);
      }
      if (items.status === 'fulfilled' && Array.isArray(items.value)) {
        setFeedbackList(items.value);
      }
    } catch (err) {
      console.warn('Failed to load feedback workspace data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  // Handle Structured Feedback Submission
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!description || description.trim().length < 5) {
      setErrorMessage('Please provide a specific description (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSubmissionResult(null);

    try {
      const payload = {
        feedback_type: selectedType,
        operational_intent: operationalIntent,
        target_type: targetType,
        target_segment_code: targetSegmentCode || null,
        description: description.trim(),
        location_name: locationName || null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        reporter_id: reporterId || 'anon_user',
        idempotency_key: `IDEMP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      };

      const result = await submitFeedback(payload);
      setSubmissionResult(result);
      setDescription('');

      // Refresh audit logs and list
      loadWorkspaceData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Moderator Review Action
  const handleReviewAction = async (feedbackId, targetStatus) => {
    setReviewingId(feedbackId);
    setErrorMessage(null);
    setModerationResult(null);

    try {
      const reviewPayload = {
        target_status: targetStatus,
        moderator_id: moderatorId || 'mod_chennai_ops',
        moderator_key: moderatorKey,
        review_notes: reviewNotes || `Transitioned to ${targetStatus} via moderation workspace.`,
      };

      await reviewFeedback(feedbackId, reviewPayload);
      setModerationResult({
        feedbackId,
        status: targetStatus,
        message: `Feedback ${feedbackId} successfully transitioned to ${targetStatus}.`,
      });
      setReviewNotes('');


      // Reload updated lists
      loadWorkspaceData();
    } catch (err) {
      setErrorMessage(err.message || `Failed to review feedback ${feedbackId}.`);
    } finally {
      setReviewingId(null);
    }
  };

  // Quick manual reassessment trigger
  const handleManualReassess = async (segmentCode) => {
    try {
      const res = await reassessSegment(segmentCode);
      setSubmissionResult({
        message: res.message,
        reassessment_triggered: true,
        segment_reassessment: res,
      });
      loadWorkspaceData();
    } catch (err) {
      setErrorMessage(err.message || `Failed to reassess segment ${segmentCode}.`);
    }
  };

  const selectedTypeMeta = feedbackTypes.find((t) => t.type_key === selectedType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        title="Feedback & Closed-Loop Reassessment"
        description="Continuously improves road network assessments through validated commuter observations, infrastructure audit updates, and auditable score recalibration."
        badge={<StatusBadge label="PHASE 12 ENGINE" variant="info" />}
      />

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          borderBottom: '1px solid var(--color-border-subtle)',
          paddingBottom: 'var(--space-2)',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'submit', label: 'Submit Feedback', icon: '📝' },
          { key: 'audit_log', label: 'Reassessment Audit Logs', icon: '⚖️', count: auditLogs.length },
          { key: 'ledger', label: 'Feedback Ledger', icon: '📋', count: feedbackList.length },
          { key: 'moderation', label: 'Moderation Console', icon: '🛡️' },
          { key: 'governance', label: 'Governance & Rules', icon: '📜' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-sm)',
              border: activeTab === tab.key ? '1px solid var(--color-brand-blue)' : '1px solid transparent',
              background: activeTab === tab.key ? 'var(--color-brand-blue-subtle)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-brand-blue)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  background: activeTab === tab.key ? 'var(--color-brand-blue)' : 'var(--color-surface-hover)',
                  color: activeTab === tab.key ? '#fff' : 'var(--color-text-muted)',
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Feedback Messages */}
      {submissionResult && (
        <FeedbackMessage type="success" onDismiss={() => setSubmissionResult(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div><strong>{submissionResult.message}</strong></div>
            {submissionResult.segment_reassessment && (
              <div
                style={{
                  background: 'var(--color-surface-card)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Segment: </span>
                  <strong>{submissionResult.segment_reassessment.segment_code}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Safety Score: </span>
                  <span style={{ textDecoration: 'line-through', marginRight: '4px' }}>
                    {submissionResult.segment_reassessment.previous_safety_score ?? '--'}
                  </span>
                  ➔ <strong style={{ color: 'var(--color-risk-low-text)' }}>
                    {submissionResult.segment_reassessment.new_safety_score ?? '--'}
                  </strong>
                  <span style={{ marginLeft: '4px', fontSize: '0.78rem', color: submissionResult.segment_reassessment.score_delta >= 0 ? '#10b981' : '#f43f5e' }}>
                    ({submissionResult.segment_reassessment.score_delta >= 0 ? '+' : ''}{submissionResult.segment_reassessment.score_delta})
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>Confidence: </span>
                  <strong>{submissionResult.segment_reassessment.new_confidence}%</strong>
                </div>
              </div>
            )}
          </div>
        </FeedbackMessage>
      )}

      {moderationResult && (
        <FeedbackMessage type="success" onDismiss={() => setModerationResult(null)}>
          <strong>{moderationResult.message}</strong>
        </FeedbackMessage>
      )}

      {errorMessage && (
        <FeedbackMessage type="danger" onDismiss={() => setErrorMessage(null)}>
          {errorMessage}
        </FeedbackMessage>
      )}

      {/* TAB 1: SUBMIT FEEDBACK */}
      {activeTab === 'submit' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'var(--space-6)' }}>
          {/* Submission Form */}
          <SectionPanel
            title="Submit Road or Assessment Observation"
            subtitle="Ground feedback informs continuous model calibration without predicting crime or guaranteeing safety"
          >
            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Feedback Category */}
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Feedback Category</span>
                  {selectedTypeMeta && (
                    <span style={{ fontSize: '0.75rem', color: selectedTypeMeta.affects_safety_score ? '#10b981' : '#64748b' }}>
                      {selectedTypeMeta.affects_safety_score ? '● Modifies Segment Assessment' : '○ General Feedback Only'}
                    </span>
                  )}
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    const meta = feedbackTypes.find((t) => t.type_key === e.target.value);
                    if (meta) setOperationalIntent(meta.default_intent);
                  }}
                  className="form-select"
                >
                  {feedbackTypes.map((t) => (
                    <option key={t.type_key} value={t.type_key}>
                      {t.label} ({t.type_key})
                    </option>
                  ))}
                </select>
                {selectedTypeMeta && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)', margin: 0 }}>
                    {selectedTypeMeta.description}
                  </p>
                )}
              </div>

              {/* Operational Intent & Target Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <SelectInput
                  label="Operational Intent"
                  value={operationalIntent}
                  onChange={(e) => setOperationalIntent(e.target.value)}
                  options={[
                    { value: 'NEW_OBSERVATION', label: 'New Observation' },
                    { value: 'CORRECTION', label: 'Correction of Existing Data' },
                    { value: 'CONFIRMATION', label: 'Confirmation / Corroboration' },
                    { value: 'DISPUTE', label: 'Dispute / Accuracy Challenge' },
                    { value: 'GENERAL_FEEDBACK', label: 'General Comment' },
                  ]}
                />
                <SelectInput
                  label="Target Entity"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  options={[
                    { value: 'SEGMENT', label: 'Road Segment' },
                    { value: 'ROUTE', label: 'Route Evaluation' },
                    { value: 'REPORT', label: 'Community Report' },
                    { value: 'GENERAL', label: 'App / General Platform' },
                  ]}
                />
              </div>

              {/* Road Segment Selection */}
              {targetType === 'SEGMENT' && (
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Associated Chennai Road Segment</label>
                  <select
                    value={targetSegmentCode}
                    onChange={(e) => setTargetSegmentCode(e.target.value)}
                    className="form-select"
                  >
                    <option value="SEG-ANNA-SALAI-04">SEG-ANNA-SALAI-04 (Mount Road / Nandanam)</option>
                    <option value="SEG-SP-ROAD-03">SEG-SP-ROAD-03 (Sardar Patel Road / Guindy)</option>
                    <option value="SEG-OMR-01">SEG-OMR-01 (Rajiv Gandhi IT Expressway Entrance)</option>
                    <option value="SEG-TNAGAR-02">SEG-TNAGAR-02 (South Usman Commercial Corridor)</option>
                    <option value="SEG-OSM-W24483756">SEG-OSM-W24483756 (Kamarajar Salai / Marina Beach)</option>
                    <option value="SEG-OSM-W51678129">SEG-OSM-W51678129 (EVR Periyar Salai / Kilpauk)</option>
                  </select>
                </div>
              )}

              {/* Geographic Coordinates (Optional override) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <TextInput
                  label="Latitude (Observation)"
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
                <TextInput
                  label="Longitude (Observation)"
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>

              <div>
                <TextInput
                  label="Location Landmark / Corridor Description (Optional)"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Near Nandanam Signal, Anna Salai"
                />
              </div>

              {/* Description */}
              <div>

                <label className="form-label" style={{ fontWeight: 600 }}>
                  Observed Factual Conditions <span style={{ color: 'var(--color-risk-high-text)' }}>*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="form-input"
                  placeholder="Describe streetlights, police booth activity, sidewalk walkability, or reason for disputing the current assessment..."
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Minimum 5 characters. Factual statements only; no personal names.
                </span>
              </div>

              {/* Reporter Pseudonym */}
              <div>
                <TextInput
                  label="Reporter Handle (Masked in public records)"
                  value={reporterId}
                  onChange={(e) => setReporterId(e.target.value)}
                  placeholder="e.g. commuter_anna_salai"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Will be displayed as <code>{reporterId ? `${reporterId.slice(0, 3)}****` : 'usr_****'}</code> to protect privacy.
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                icon="🔄"
                style={{ width: '100%', marginTop: 'var(--space-2)' }}
              >
                Submit Feedback & Trigger Reassessment
              </Button>
            </form>
          </SectionPanel>

          {/* Quick Context & Explanatory Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <SectionPanel
              title="Continuous Reassessment Mechanics"
              subtitle="Controlled feedback loop without unverified self-promotion"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: '0.85rem' }}>
                <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-brand-blue)', marginBottom: '4px' }}>
                    1. Factual Validation & De-duplication
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
                    Submissions are checked for rapid-fire duplicate bursts and idempotency. Unverified observations do not automatically become ground truth.
                  </p>
                </div>

                <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '4px' }}>
                    2. Spatial Association & Evidence Bridging
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
                    Resolved feedback updates or injects evidence records into the established 5 Chennai streams (Lighting, Police, Footfall, Road, Community).
                  </p>
                </div>

                <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ fontWeight: 600, color: '#10b981', marginBottom: '4px' }}>
                    3. Atomic Segment Recalibration
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
                    The underlying Risk Engine recalibrates the affected segment's Safety Score [15–95] and Data Confidence [10–100]%, persisting an auditable log entry.
                  </p>
                </div>

                <div style={{ padding: 'var(--space-3)', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>
                    ⚠️ Non-Predictive Disclaimer
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                    Reassessment updates reflect model recalibrations based on submitted evidence. They do not constitute empirical predictions of crime or guarantees of personal safety.
                  </p>
                </div>
              </div>
            </SectionPanel>

            {/* Quick Reassessment Trigger for Tested Corridors */}
            <SectionPanel
              title="Quick Corridor Health Recalibration"
              subtitle="Explicitly trigger re-evaluation for key Chennai road segments"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {[
                  { code: 'SEG-ANNA-SALAI-04', label: 'Anna Salai / Nandanam' },
                  { code: 'SEG-SP-ROAD-03', label: 'Sardar Patel Road / Guindy' },
                  { code: 'SEG-OMR-01', label: 'Rajiv Gandhi IT Corridor' },
                  { code: 'SEG-TNAGAR-02', label: 'South Usman Road' },
                ].map((item) => (
                  <div
                    key={item.code}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--color-surface-card)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>{item.code}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleManualReassess(item.code)}
                    >
                      Recalculate
                    </Button>
                  </div>
                ))}
              </div>
            </SectionPanel>
          </div>
        </div>
      )}

      {/* TAB 2: REASSESSMENT AUDIT LOGS */}
      {activeTab === 'audit_log' && (
        <SectionPanel
          title="Reassessment Audit Logs"
          subtitle="Transparent, immutable record of safety score and confidence changes triggered by evidence and feedback"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div style={{ width: '280px' }}>
              <TextInput
                placeholder="Filter by segment code (e.g. ANNA)..."
                value={auditFilterSegment}
                onChange={(e) => setAuditFilterSegment(e.target.value)}
              />
            </div>
            {loadingData && (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-brand-blue)' }}>● Refreshing audit logs...</span>
            )}
          </div>

          {auditLogs.filter((l) => !auditFilterSegment || (l.segment_code || '').toLowerCase().includes(auditFilterSegment.toLowerCase())).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
              No reassessment audit logs matching the filter. Submit feedback or clear filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {auditLogs
                .filter((l) => !auditFilterSegment || (l.segment_code || '').toLowerCase().includes(auditFilterSegment.toLowerCase()))
                .map((log) => {

                const scoreDeltaPositive = (log.score_delta || 0) >= 0;
                const confDeltaPositive = (log.confidence_delta || 0) >= 0;
                return (
                  <div
                    key={log.audit_id}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-brand-blue)' }}>
                          {log.audit_id}
                        </span>
                        <StatusBadge label={log.trigger_type} variant="info" />
                        {log.segment_code && (
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            Segment: {log.segment_code}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      {log.explanation_summary}
                    </div>

                    {/* Metric Deltas Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: 'var(--space-2)',
                        background: 'rgba(0,0,0,0.15)',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Safety Score: </span>
                        <span>{log.previous_safety_score ?? '--'} ➔ </span>
                        <strong>{log.new_safety_score ?? '--'} </strong>
                        <span style={{ fontWeight: 700, color: scoreDeltaPositive ? '#10b981' : '#f43f5e' }}>
                          ({scoreDeltaPositive ? '+' : ''}{log.score_delta})
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Confidence: </span>
                        <span>{log.previous_confidence ?? '--'}% ➔ </span>
                        <strong>{log.new_confidence ?? '--'}% </strong>
                        <span style={{ fontWeight: 700, color: confDeltaPositive ? '#10b981' : '#f43f5e' }}>
                          ({confDeltaPositive ? '+' : ''}{log.confidence_delta}%)
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)' }}>Reference: </span>
                        <span style={{ fontFamily: 'monospace' }}>{log.trigger_reference_id}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionPanel>
      )}

      {/* TAB 3: FEEDBACK LEDGER */}
      {activeTab === 'ledger' && (
        <SectionPanel
          title="Submitted Feedback Ledger"
          subtitle="Crowd-sourced observations and status in the verification lifecycle"
        >
          {feedbackList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>
              No feedback records found. Submit observations using the Submit tab.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {feedbackList.map((fb) => (
                <div
                  key={fb.feedback_id}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem' }}>
                        {fb.feedback_id}
                      </span>
                      <StatusBadge label={fb.feedback_type} variant="info" />
                      <StatusBadge
                        label={fb.status}
                        variant={
                          fb.status === 'ACCEPTED'
                            ? 'success'
                            : fb.status === 'PENDING_REVIEW'
                            ? 'warning'
                            : fb.status === 'REJECTED'
                            ? 'danger'
                            : 'neutral'
                        }
                      />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      By <code style={{ color: 'var(--color-text-primary)' }}>{fb.reporter_id_masked}</code> • {new Date(fb.submitted_at).toLocaleDateString()}
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>
                    {fb.description}
                  </p>

                  <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: '0.78rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                    {fb.target_segment_code && (
                      <div>Segment: <strong style={{ color: 'var(--color-text-primary)' }}>{fb.target_segment_code}</strong></div>
                    )}
                    {fb.location_name && (
                      <div>Location: <span style={{ color: 'var(--color-text-primary)' }}>{fb.location_name}</span></div>
                    )}
                    <div>
                      Reassessment: {fb.reassessment_applied ? (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Applied</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>Pending Review</span>
                      )}
                    </div>
                  </div>

                  {fb.review_notes && (
                    <div style={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.02)', padding: 'var(--space-2)', borderRadius: '4px' }}>
                      Review remarks: {fb.review_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
      )}

      {/* TAB 4: MODERATION CONSOLE */}
      {activeTab === 'moderation' && (
        <SectionPanel
          title="Administrative Review & Moderation Console"
          subtitle="Authorized analysts evaluate disputed feedback, verify claims, and action reassessments"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Moderator Credentials Panel */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 'var(--space-3)',
                background: 'rgba(0,0,0,0.2)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <TextInput
                label="Moderator ID"
                value={moderatorId}
                onChange={(e) => setModeratorId(e.target.value)}
              />
              <TextInput
                label="Moderator Authorization Key"
                type="password"
                value={moderatorKey}
                onChange={(e) => setModeratorKey(e.target.value)}
              />
              <div>
                <TextInput
                  label="Review Rationale / Field Notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Field inspection confirms unlit streetlight..."
                />
              </div>
            </div>

            {/* Pending Feedback Review Queue */}
            <div style={{ marginTop: 'var(--space-2)' }}>
              <h4 style={{ margin: '0 0 var(--space-3) 0', fontSize: '0.95rem' }}>
                Pending Review Queue ({feedbackList.filter((f) => f.status === 'PENDING_REVIEW').length})
              </h4>

              {feedbackList.filter((f) => f.status === 'PENDING_REVIEW').length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)', background: 'var(--color-surface-card)', borderRadius: 'var(--radius-sm)' }}>
                  No feedback items currently awaiting review. All submissions are up to date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {feedbackList
                    .filter((f) => f.status === 'PENDING_REVIEW')
                    .map((item) => (
                      <div
                        key={item.feedback_id}
                        style={{
                          background: 'var(--color-surface-card)',
                          border: '1px solid #f59e0b',
                          borderRadius: 'var(--radius-sm)',
                          padding: 'var(--space-4)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-3)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{item.feedback_id}</span>
                            <StatusBadge label={item.feedback_type} variant="warning" />
                            <StatusBadge label={item.operational_intent} variant="info" />
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            {new Date(item.submitted_at).toLocaleTimeString()}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>
                          <strong>Observation:</strong> {item.description}
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          <div>Target Segment: <strong>{item.target_segment_code || 'Unresolved'}</strong></div>
                          <div>Reporter: <code>{item.reporter_id_masked}</code></div>
                        </div>

                        {/* Moderation Actions */}
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-1)', flexWrap: 'wrap' }}>
                          <Button
                            size="sm"
                            variant="primary"
                            loading={reviewingId === item.feedback_id}
                            onClick={() => handleReviewAction(item.feedback_id, 'ACCEPTED')}
                          >
                            ✓ Accept & Reassess Segment
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={reviewingId === item.feedback_id}
                            onClick={() => handleReviewAction(item.feedback_id, 'RESOLVED')}
                          >
                            Mark Resolved
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={reviewingId === item.feedback_id}
                            onClick={() => handleReviewAction(item.feedback_id, 'REJECTED')}
                          >
                            ✗ Reject / Inaccurate
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </SectionPanel>
      )}

      {/* TAB 5: GOVERNANCE & RULES */}
      {activeTab === 'governance' && (
        <SectionPanel
          title="Feedback Governance & Ethical Safety Boundaries"
          subtitle="Clear policies governing how commuter feedback affects navigational assessments"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            <div>
              <h4 style={{ color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0' }}>
                1. Separation of Product Feedback from Road Evidence
              </h4>
              <p style={{ margin: 0 }}>
                <code>GENERAL_PRODUCT_FEEDBACK</code> (such as UX comments, audio language requests, or app bug reports) is strictly categorized and resolved without ever altering road segment weights or route calculations. Only spatial observations affecting verified infrastructure or environmental conditions participate in risk score calculations.
              </p>
            </div>

            <div>
              <h4 style={{ color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0' }}>
                2. Privacy-Preserving Reporter Identity
              </h4>
              <p style={{ margin: 0 }}>
                In accordance with civic safety principles, user identifiers are masked in all public API responses and ledger records (e.g. <code>usr_****4a12</code>). No private contact information or email addresses are stored or rendered in public route explainability dashboards.
              </p>
            </div>

            <div>
              <h4 style={{ color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0' }}>
                3. Anti-Abuse, Rate-Limiting & Idempotency
              </h4>
              <p style={{ margin: 0 }}>
                Submissions enforce a maximum of 10 submissions per hour per user handle. Repeated submissions with the same idempotency key or duplicate reports within a 2-hour window are acknowledged idempotently without distorting score deltas. Self-verification is strictly blocked; a reporter cannot act as moderator for their own report.
              </p>
            </div>

            <div>
              <h4 style={{ color: 'var(--color-text-primary)', margin: '0 0 var(--space-1) 0' }}>
                4. Absence of Evidence is Not Proof of Safety
              </h4>
              <p style={{ margin: 0 }}>
                A road segment with zero community reports or disputed feedback is never assigned a perfect score or assumed safe. Unassessed corridors remain explicitly flagged as <code>LIMITED_EVIDENCE</code> or <code>INSUFFICIENT_DATA</code>.
              </p>
            </div>
          </div>
        </SectionPanel>
      )}
    </div>
  );
}

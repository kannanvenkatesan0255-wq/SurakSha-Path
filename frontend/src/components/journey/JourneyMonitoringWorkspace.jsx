import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SectionPanel } from '../common/SectionPanel';
import { Button } from '../common/Button';
import { TextInput } from '../common/Input';
import { MapWorkspace } from '../map/MapWorkspace';
import { SosConfirmationModal } from './SosConfirmationModal';
import {
  JOURNEY_STATUSES,
  CHECK_IN_INTERVALS,
  CHENNAI_EMERGENCY_HELPLINES,
} from '../../utils/constants';
import {
  saveJourneySession,
  loadJourneySession,
  clearJourneySession,
  loadTrustedContacts,
  saveTrustedContacts,
  loadJourneySettings,
  saveJourneySettings,
  saveJourneyRecord,
} from '../../services/journeyStorage';
import {
  fetchChennaiHelplines,
  startJourneySession,
  transitionJourneySession,
} from '../../api/journey';

/**
 * Formats seconds into HH:MM:SS string.
 */
function formatDuration(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Gets current IST formatted timestamp.
 */
function getNowIstString() {
  const d = new Date();
  return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST';
}

/**
 * JourneyMonitoringWorkspace Component (Phase 14).
 * Safety Check-In, Active Journey Monitoring, In-App SOS Workflow, and Local Privacy Controls.
 */
export function JourneyMonitoringWorkspace({
  activeRoute = null,
  onNavigateToPlanner = null,
  onSelectRoute = null,
}) {
  // Load persisted session or settings
  const initialSavedSession = useMemo(() => loadJourneySession(), []);
  const initialSettings = useMemo(() => loadJourneySettings(), []);

  // Journey Lifecycle State
  const [journeyId, setJourneyId] = useState(initialSavedSession?.journey_id || null);
  const [status, setStatus] = useState(initialSavedSession?.status || 'NOT_STARTED');

  // Corridor parameters derived from active route or saved session
  const origin = initialSavedSession?.origin || activeRoute?.origin || 'Chennai Central Railway Station';
  const destination = initialSavedSession?.destination || activeRoute?.destination || 'T. Nagar Bus Terminus';
  const routeType = initialSavedSession?.route_type || activeRoute?.route_type || 'BALANCED';
  const distanceKm = initialSavedSession?.distance_km ?? activeRoute?.metrics?.distance_km ?? 8.4;
  const durationMinutes = initialSavedSession?.duration_minutes ?? activeRoute?.metrics?.duration_minutes ?? 25.0;
  const safetyScore = initialSavedSession?.safety_score ?? activeRoute?.safety_score ?? 78.5;
  const confidenceScore = initialSavedSession?.confidence_score ?? activeRoute?.confidence_score ?? 82.0;

  // Timers & Check-In
  const [checkInIntervalMinutes, setCheckInIntervalMinutes] = useState(
    initialSavedSession?.check_in_interval_minutes || initialSettings.checkInIntervalMinutes || 15
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(initialSavedSession?.elapsed_seconds || 0);
  const [secondsUntilCheckIn, setSecondsUntilCheckIn] = useState(
    initialSavedSession ? Math.max(0, checkInIntervalMinutes * 60 - (initialSavedSession.elapsed_seconds % (checkInIntervalMinutes * 60))) : checkInIntervalMinutes * 60
  );
  const [checkInDue, setCheckInDue] = useState(false);
  const [checkInMissed, setCheckInMissed] = useState(false);
  const [missedCount, setMissedCount] = useState(initialSavedSession?.missed_check_in_count || 0);

  // SOS State
  const [sosActive, setSosActive] = useState(initialSavedSession?.sos_active || false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosModalMode, setSosModalMode] = useState('ACTIVATE'); // 'ACTIVATE' | 'RESOLVE'

  // Location Sharing & Privacy State (Off by default)
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(
    initialSavedSession?.location_sharing_enabled ?? initialSettings.locationSharingEnabled ?? false
  );
  const [gpsStatus, setGpsStatus] = useState('ACQUIRING');
  const [deviceLocation, setDeviceLocation] = useState(null); // { lat, lng }
  const [isDemoMode, setIsDemoMode] = useState(initialSettings.isDemoMode || false);
  const [demoProgressIdx, setDemoProgressIdx] = useState(0);

  const effectiveLocationStatus = !locationSharingEnabled
    ? 'OFF_BY_DEFAULT'
    : isDemoMode
    ? 'SIMULATED_DEMO'
    : gpsStatus;

  // Emergency Contacts (Local prototype only)
  const [trustedContacts, setTrustedContacts] = useState(() => loadTrustedContacts());
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);

  // Event History Ledger
  const [eventHistory, setEventHistory] = useState(initialSavedSession?.events || []);

  // Helplines from API or fallback
  const [helplines, setHelplines] = useState(CHENNAI_EMERGENCY_HELPLINES);

  // SOS Press-and-Hold state
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef(null);

  // Load helplines on mount
  useEffect(() => {
    fetchChennaiHelplines()
      .then((res) => {
        if (res && res.helplines && res.helplines.length > 0) {
          setHelplines(res.helplines);
        }
      })
      .catch(() => {});
  }, []);

  // Helper to append events
  const addEvent = (type, summary, details = null) => {
    const newEvt = {
      event_id: `EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      event_type: type,
      timestamp_ist: getNowIstString(),
      summary,
      details,
    };
    setEventHistory((prev) => [newEvt, ...prev]);
  };

  // Sync session state to localStorage
  useEffect(() => {
    if (journeyId && status !== 'NOT_STARTED') {
      saveJourneySession({
        journey_id: journeyId,
        status,
        origin,
        destination,
        route_type: routeType,
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        safety_score: safetyScore,
        confidence_score: confidenceScore,
        check_in_interval_minutes: checkInIntervalMinutes,
        elapsed_seconds: elapsedSeconds,
        missed_check_in_count: missedCount,
        sos_active: sosActive,
        location_sharing_enabled: locationSharingEnabled,
        events: eventHistory.slice(0, 30), // keep latest 30 in storage
      });
    }
  }, [
    journeyId,
    status,
    origin,
    destination,
    routeType,
    distanceKm,
    durationMinutes,
    safetyScore,
    confidenceScore,
    checkInIntervalMinutes,
    elapsedSeconds,
    missedCount,
    sosActive,
    locationSharingEnabled,
    eventHistory,
  ]);

  // Main Journey Active Timer
  useEffect(() => {
    let timerId = null;
    if (status === 'ACTIVE') {
      timerId = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);

        setSecondsUntilCheckIn((prev) => {
          if (prev <= 1) {
            // Check-in is due!
            setCheckInDue(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [status]);

  // Missed Check-In Grace Period Timer
  useEffect(() => {
    let graceTimer = null;
    if (checkInDue && !checkInMissed && status === 'ACTIVE') {
      // Grace period: 30 seconds for fast demo intervals (<= 1 min), else 90 seconds
      const gracePeriodMs = checkInIntervalMinutes <= 1 ? 30000 : 90000;
      graceTimer = setTimeout(() => {
        setCheckInMissed(true);
        setMissedCount((c) => c + 1);
        addEvent(
          'CHECK_IN_MISSED',
          `Check-in missed (Count: ${missedCount + 1})`,
          'Check-in interval elapsed without response. Uncertain signal; no automatic emergency alerts sent.'
        );
      }, gracePeriodMs);
    }
    return () => {
      if (graceTimer) clearTimeout(graceTimer);
    };
  }, [checkInDue, checkInMissed, status, checkInIntervalMinutes, missedCount]);

  // Geolocation handling (Opt-in only)
  useEffect(() => {
    if (!locationSharingEnabled || isDemoMode) {
      setDeviceLocation(null);
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsStatus('UNAVAILABLE');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('LIVE_GPS');
        setDeviceLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('PERMISSION_DENIED');
        } else {
          setGpsStatus('UNAVAILABLE');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [locationSharingEnabled, isDemoMode]);

  // Demo Simulated Progression
  const demoCoordinates = useMemo(() => {
    // Generate 12 sample progression steps between Chennai Central and T. Nagar
    const start = [13.0827, 80.2707];
    const end = [13.0418, 80.2341];
    const points = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      points.push({
        lat: start[0] + (end[0] - start[0]) * frac + (Math.sin(frac * Math.PI) * 0.005),
        lng: start[1] + (end[1] - start[1]) * frac - (Math.sin(frac * Math.PI) * 0.004),
      });
    }
    return points;
  }, []);

  useEffect(() => {
    let demoInterval = null;
    if (status === 'ACTIVE' && isDemoMode && locationSharingEnabled) {
      demoInterval = setInterval(() => {
        setDemoProgressIdx((prev) => (prev + 1) % demoCoordinates.length);
      }, 4000);
    }
    return () => {
      if (demoInterval) clearInterval(demoInterval);
    };
  }, [status, isDemoMode, locationSharingEnabled, demoCoordinates.length]);

  const activePosition = useMemo(() => {
    if (!locationSharingEnabled) return null;
    if (isDemoMode) {
      const coord = demoCoordinates[demoProgressIdx];
      return {
        lat: coord.lat,
        lng: coord.lng,
        isSimulated: true,
        label: `Demo Position (Step ${demoProgressIdx + 1}/${demoCoordinates.length})`,
      };
    }
    if (deviceLocation) {
      return {
        lat: deviceLocation.lat,
        lng: deviceLocation.lng,
        isSimulated: false,
        label: 'Current Device GPS',
      };
    }
    return null;
  }, [locationSharingEnabled, isDemoMode, demoProgressIdx, demoCoordinates, deviceLocation]);

  // =========================================================================
  // JOURNEY LIFECYCLE HANDLERS
  // =========================================================================

  const handleStartJourney = async () => {
    const newJourneyId = `JRN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    setJourneyId(newJourneyId);
    setStatus('ACTIVE');
    setElapsedSeconds(0);
    setSecondsUntilCheckIn(checkInIntervalMinutes * 60);
    setCheckInDue(false);
    setCheckInMissed(false);
    setMissedCount(0);
    setSosActive(false);

    const initialEvent = {
      event_id: `EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      event_type: 'JOURNEY_STARTED',
      timestamp_ist: getNowIstString(),
      summary: `Journey started from ${origin} to ${destination}`,
      details: `Route: ${routeType} | Interval: ${checkInIntervalMinutes}m | Distance: ${distanceKm}km`,
    };
    setEventHistory([initialEvent]);

    // Optional backend session sync
    try {
      await startJourneySession({
        origin,
        destination,
        route_id: activeRoute?.route_id || 'ROUTE-CUSTOM',
        route_type: routeType,
        distance_km: distanceKm,
        duration_minutes: durationMinutes,
        safety_score: safetyScore,
        confidence_score: confidenceScore,
        check_in_interval_minutes: Math.max(1, Math.round(checkInIntervalMinutes)),
        location_sharing_enabled: locationSharingEnabled,
        is_demo_mode: isDemoMode,
      });
    } catch {
      // Local session operates independently if network is unavailable
    }
  };

  const handlePauseJourney = async () => {
    if (status !== 'ACTIVE') return;
    setStatus('PAUSED');
    addEvent('JOURNEY_PAUSED', 'Journey paused by commuter');
    try {
      if (journeyId) await transitionJourneySession({ journey_id: journeyId, action: 'pause' });
    } catch {}
  };

  const handleResumeJourney = async () => {
    if (status !== 'PAUSED') return;
    setStatus('ACTIVE');
    setSecondsUntilCheckIn(checkInIntervalMinutes * 60);
    setCheckInDue(false);
    setCheckInMissed(false);
    addEvent('JOURNEY_RESUMED', 'Journey resumed by commuter');
    try {
      if (journeyId) await transitionJourneySession({ journey_id: journeyId, action: 'resume' });
    } catch {}
  };

  const handleCompleteJourney = async () => {
    if (status !== 'ACTIVE' && status !== 'PAUSED') return;
    setStatus('COMPLETED');
    setCheckInDue(false);
    setCheckInMissed(false);
    setSosActive(false);
    addEvent('JOURNEY_COMPLETED', 'Journey completed successfully at destination');
    
    // Phase 15: Archive into local journey history ledger
    saveJourneyRecord({
      journey_id: journeyId || `JRN-${Date.now()}`,
      status: 'COMPLETED',
      origin,
      destination,
      route_type: routeType,
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      elapsed_seconds: elapsedSeconds,
      safety_score: safetyScore,
      confidence_score: confidenceScore,
      start_time_ist: getNowIstString(),
      end_time_ist: getNowIstString(),
      date_ymd: new Date().toISOString().split('T')[0],
      is_demo: isDemoMode,
      events_count: eventHistory.length + 1,
      check_in_count: eventHistory.filter((e) => e.type === 'CHECK_IN_COMPLETED').length,
      missed_check_in_count: missedCount,
      sos_activated: sosActive,
    });

    try {
      if (journeyId) await transitionJourneySession({ journey_id: journeyId, action: 'complete' });
    } catch {}
  };

  const handleCancelJourney = async () => {
    if (status !== 'ACTIVE' && status !== 'PAUSED') return;
    setStatus('CANCELLED');
    setCheckInDue(false);
    setCheckInMissed(false);
    setSosActive(false);
    addEvent('JOURNEY_CANCELLED', 'Journey cancelled by commuter');

    // Phase 15: Archive into local journey history ledger
    saveJourneyRecord({
      journey_id: journeyId || `JRN-${Date.now()}`,
      status: 'CANCELLED',
      origin,
      destination,
      route_type: routeType,
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      elapsed_seconds: elapsedSeconds,
      safety_score: safetyScore,
      confidence_score: confidenceScore,
      start_time_ist: getNowIstString(),
      end_time_ist: getNowIstString(),
      date_ymd: new Date().toISOString().split('T')[0],
      is_demo: isDemoMode,
      events_count: eventHistory.length + 1,
      check_in_count: eventHistory.filter((e) => e.type === 'CHECK_IN_COMPLETED').length,
      missed_check_in_count: missedCount,
      sos_activated: sosActive,
    });

    try {
      if (journeyId) await transitionJourneySession({ journey_id: journeyId, action: 'cancel' });
    } catch {}
  };

  const handleResetSession = () => {
    clearJourneySession();
    setJourneyId(null);
    setStatus('NOT_STARTED');
    setElapsedSeconds(0);
    setSecondsUntilCheckIn(checkInIntervalMinutes * 60);
    setCheckInDue(false);
    setCheckInMissed(false);
    setMissedCount(0);
    setSosActive(false);
    setEventHistory([]);
  };

  // =========================================================================
  // CHECK-IN HANDLERS
  // =========================================================================

  const handleCheckInOk = async () => {
    setCheckInDue(false);
    setCheckInMissed(false);
    setSecondsUntilCheckIn(checkInIntervalMinutes * 60);
    addEvent(
      'CHECK_IN_COMPLETED',
      'Safety check-in: Commuter confirmed OK',
      `Next prompt scheduled in ${checkInIntervalMinutes} minutes.`
    );
    try {
      if (journeyId) await transitionJourneySession({ journey_id: journeyId, action: 'check_in_ok' });
    } catch {}
  };

  const handleCheckInHelp = async () => {
    setCheckInDue(false);
    setCheckInMissed(false);
    setSosActive(true);
    addEvent(
      'CHECK_IN_COMPLETED',
      'Safety check-in: Commuter indicated need for assistance',
      'Activated in-app SOS mode and presented emergency helplines.'
    );
    addEvent(
      'SOS_ACTIVATED',
      'In-App SOS activated via check-in prompt',
      'Displaying verified emergency telephone numbers.'
    );
    try {
      if (journeyId) await transitionJourneySession({ journey_id: journeyId, action: 'check_in_help' });
    } catch {}
  };

  const handleResolveMissedCheckIn = async () => {
    setCheckInDue(false);
    setCheckInMissed(false);
    setSecondsUntilCheckIn(checkInIntervalMinutes * 60);
    addEvent(
      'CHECK_IN_MISSED_RESOLVED',
      'Missed check-in resolved: Commuter confirmed safe',
      `Resumed monitoring cadence (${checkInIntervalMinutes}m).`
    );
    try {
      if (journeyId) await transitionJourneySession({ journey_id: journeyId, action: 'check_in_missed_resolved' });
    } catch {}
  };

  // =========================================================================
  // SOS HANDLERS
  // =========================================================================

  const handleOpenSosModal = () => {
    setSosModalMode('ACTIVATE');
    setSosModalOpen(true);
  };

  const handleOpenResolveSosModal = () => {
    setSosModalMode('RESOLVE');
    setSosModalOpen(true);
  };

  const handleConfirmSosModal = async () => {
    setSosModalOpen(false);
    if (sosModalMode === 'ACTIVATE') {
      setSosActive(true);
      addEvent(
        'SOS_ACTIVATED',
        'In-App SOS Mode activated by commuter',
        'High-visibility emergency state displayed. Emergency helplines accessible.'
      );
      try {
        if (journeyId) await transitionJourneySession({ journey_id: journeyId, action: 'sos_activate' });
      } catch {}
    } else {
      setSosActive(false);
      addEvent(
        'SOS_RESOLVED',
        'In-App SOS Mode resolved: Commuter confirmed safe',
        'Standard monitoring resumed.'
      );
      try {
        if (journeyId) await transitionJourneySession({ journey_id: journeyId, action: 'sos_resolve' });
      } catch {}
    }
  };

  // Press-and-Hold SOS interaction
  const startHold = () => {
    if (sosActive) return;
    setHoldProgress(0);
    const start = Date.now();
    const duration = 2000; // 2 seconds hold
    holdTimerRef.current = setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      setHoldProgress(p);
      if (p >= 100) {
        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        setHoldProgress(0);
        setSosActive(true);
        addEvent('SOS_ACTIVATED', 'In-App SOS Mode activated via 2-second hold', 'Direct emergency numbers accessible.');
      }
    }, 50);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  // =========================================================================
  // CONTACT MANAGEMENT HANDLERS
  // =========================================================================

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    const updated = [
      ...trustedContacts,
      {
        id: `contact-${Date.now()}`,
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        relationship: 'Trusted Emergency Contact',
      },
    ];
    setTrustedContacts(updated);
    saveTrustedContacts(updated);
    setNewContactName('');
    setNewContactPhone('');
    setShowContactForm(false);
  };

  const handleRemoveContact = (id) => {
    const updated = trustedContacts.filter((c) => c.id !== id);
    setTrustedContacts(updated);
    saveTrustedContacts(updated);
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear local journey event history for this session?')) {
      setEventHistory([]);
    }
  };

  const currentStatusConfig = JOURNEY_STATUSES[status] || JOURNEY_STATUSES.NOT_STARTED;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', width: '100%' }}>
      {/* SOS Active Pulsing Banner (Step 4) */}
      {sosActive && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.4) 100%)',
            border: '2px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4) var(--space-5)',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            animation: 'pulse-glow 2s infinite ease-in-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: '2rem' }} aria-hidden="true">🚨</span>
              <div>
                <h3 style={{ margin: 0, color: '#f87171', fontSize: '1.25rem', fontWeight: 800 }}>
                  IN-APP SOS MODE ACTIVE
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#fca5a5' }}>
                  Emergency helpline directory & assistance guidelines presented below.
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenResolveSosModal}
              style={{
                borderColor: '#10b981',
                color: '#34d399',
                fontWeight: 700,
              }}
            >
              ✅ Resolve SOS / I Am Safe
            </Button>
          </div>

          <div
            style={{
              fontSize: '0.8rem',
              color: '#fee2e2',
              lineHeight: 1.45,
              background: 'rgba(15, 23, 42, 0.6)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <strong>CRITICAL PROTOTYPE NOTICE:</strong> This application is a technological navigation prototype.
            In-app SOS mode activates internal state logging; it does <em>NOT</em> automatically alert police dispatch or dial 100 on your behalf.
            Please tap the emergency numbers below to dial real-world responders directly from your phone.
          </div>

          {/* Quick Dial Shortcuts */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <a
              href="tel:100"
              className="btn btn-sm"
              style={{
                background: '#dc2626',
                color: '#ffffff',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              📞 Dial Police (100 / 112)
            </a>
            <a
              href="tel:1091"
              className="btn btn-sm"
              style={{
                background: '#9333ea',
                color: '#ffffff',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              📞 Women Helpline (1091)
            </a>
            <a
              href="tel:108"
              className="btn btn-sm"
              style={{
                background: '#ea580c',
                color: '#ffffff',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              📞 Ambulance (108)
            </a>
            <a
              href="tel:1913"
              className="btn btn-sm"
              style={{
                background: '#0284c7',
                color: '#ffffff',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              📞 GCC Flood Helpline (1913)
            </a>
          </div>
        </div>
      )}

      {/* Safety Check-In Prompt Banner (Step 3) */}
      {checkInDue && status === 'ACTIVE' && (
        <div
          role="region"
          aria-live="polite"
          style={{
            background: checkInMissed
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(180, 83, 9, 0.35) 100%)'
              : 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(30, 64, 175, 0.35) 100%)',
            border: checkInMissed ? '2px solid #f59e0b' : '2px solid var(--color-brand-blue)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4) var(--space-5)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: '1.8rem' }} aria-hidden="true">
                {checkInMissed ? '⚠️' : '🔔'}
              </span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>
                  {checkInMissed ? 'SAFETY CHECK-IN OVERDUE' : 'SCHEDULED SAFETY CHECK-IN'}
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                  {checkInMissed
                    ? 'Interval elapsed without response. Confirming your status resumes monitoring.'
                    : 'Please confirm that your journey is proceeding safely.'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={checkInMissed ? handleResolveMissedCheckIn : handleCheckInOk}
                style={{
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  padding: '10px 18px',
                  backgroundColor: '#10b981',
                  borderColor: '#059669',
                }}
              >
                ✅ I'm OK
              </Button>

              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleCheckInHelp}
                style={{
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  padding: '10px 18px',
                }}
              >
                ⚠️ I need help
              </Button>
            </div>
          </div>

          {checkInMissed && (
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Note: A missed check-in is an uncertain event and does NOT indicate verified danger. No emergency services were alerted automatically.
            </div>
          )}
        </div>
      )}

      {/* Main Workspace Grid: Controls & Summary (Left) + Interactive Map (Right) */}
      <div
        className="journey-monitoring-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(min(100%, 380px), 460px) minmax(0, 1fr)',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Lifecycle, Settings, SOS Controls, Contacts & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0 }}>
          {/* Journey Status Card */}
          <SectionPanel
            title="Journey Safety Monitoring"
            subtitle="Real-time check-in cadence, journey status, and emergency safeguards"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Status Header Badge & Journey ID */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  className={`badge badge-${currentStatusConfig.badgeVariant}`}
                  style={{ fontSize: '0.78rem', padding: '4px 10px', fontWeight: 800 }}
                >
                  {currentStatusConfig.fullLabel}
                </span>

                {journeyId && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ID: {journeyId}
                  </span>
                )}
              </div>

              {/* Route Summary Details */}
              <div
                style={{
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--space-3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    CORRIDOR
                  </span>
                  <span className="badge badge-info" style={{ fontSize: '0.66rem' }}>
                    {routeType} STRATEGY
                  </span>
                </div>

                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {origin}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ➔ destination: <strong style={{ color: 'var(--color-text-secondary)' }}>{destination}</strong>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--space-2)',
                    marginTop: 'var(--space-2)',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid var(--color-border-subtle)',
                    fontSize: '0.74rem',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Distance</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{distanceKm} km</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Est. Duration</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{durationMinutes} min</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Safety Score</div>
                    <div style={{ fontWeight: 700, color: '#38bdf8' }}>{safetyScore}/100</div>
                  </div>
                </div>
              </div>

              {/* Live Journey Timers (Elapsed & Next Check-In) */}
              {status === 'ACTIVE' && (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-3)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                      ⏱️ ELAPSED TIME
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatDuration(elapsedSeconds)}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                      🔔 NEXT CHECK-IN IN
                    </span>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: secondsUntilCheckIn < 60 ? '#f59e0b' : 'var(--color-brand-cyan)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {formatDuration(secondsUntilCheckIn)}
                    </div>
                  </div>
                </div>
              )}

              {/* Check-In Interval Configuration (Step 3) */}
              {status === 'NOT_STARTED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label htmlFor="check-in-interval" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Safety Check-In Cadence
                  </label>
                  <select
                    id="check-in-interval"
                    value={checkInIntervalMinutes}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setCheckInIntervalMinutes(val);
                      saveJourneySettings({ ...initialSettings, checkInIntervalMinutes: val });
                    }}
                    style={{
                      background: 'var(--color-surface-input)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '8px 10px',
                      fontSize: '0.82rem',
                    }}
                  >
                    {CHECK_IN_INTERVALS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    Periodic prompts confirm your safety. For browser demonstrations, shorter intervals (30s / 1m) can be used.
                  </span>
                </div>
              )}

              {/* Lifecycle Primary Action Buttons (Step 2) */}
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-1)' }}>
                {status === 'NOT_STARTED' && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%' }}>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={handleStartJourney}
                      style={{ flex: 1, fontWeight: 700 }}
                    >
                      ▶️ Start Journey Monitoring
                    </Button>
                    {onNavigateToPlanner && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={onNavigateToPlanner}
                        style={{ fontSize: '0.82rem' }}
                      >
                        🗺️ Change Route
                      </Button>
                    )}
                  </div>
                )}

                {status === 'ACTIVE' && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handlePauseJourney}
                      style={{ flex: 1 }}
                    >
                      ⏸️ Pause
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleCompleteJourney}
                      style={{ flex: 1, backgroundColor: '#10b981', borderColor: '#059669' }}
                    >
                      🏁 Complete
                    </Button>
                    <Button
                      type="button"
                      variant="subtle"
                      size="sm"
                      onClick={handleCancelJourney}
                      style={{ color: '#ef4444' }}
                    >
                      ✕ Cancel
                    </Button>
                  </>
                )}

                {status === 'PAUSED' && (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleResumeJourney}
                      style={{ flex: 1 }}
                    >
                      ▶️ Resume Journey
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCompleteJourney}
                      style={{ flex: 1 }}
                    >
                      🏁 Complete
                    </Button>
                    <Button
                      type="button"
                      variant="subtle"
                      size="sm"
                      onClick={handleCancelJourney}
                      style={{ color: '#ef4444' }}
                    >
                      ✕ Cancel
                    </Button>
                  </>
                )}

                {(status === 'COMPLETED' || status === 'CANCELLED') && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleResetSession}
                      style={{ flex: 1 }}
                    >
                      🔄 Reset Session
                    </Button>
                    {onNavigateToPlanner && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={onNavigateToPlanner}
                        style={{ flex: 1 }}
                      >
                        🗺️ Plan Next Route
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </SectionPanel>

          {/* Prominent Accessible SOS Interface (Step 4) */}
          <SectionPanel
            title="Emergency SOS & Assistance"
            subtitle="Deliberate emergency activation with verified Chennai helplines"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {!sosActive ? (
                <>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                    In case of immediate concern, trigger in-app SOS mode. Accidental activations are prevented by a confirmation step or a 2-second hold.
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    {/* Hold-to-activate button */}
                    <button
                      type="button"
                      onMouseDown={startHold}
                      onMouseUp={cancelHold}
                      onMouseLeave={cancelHold}
                      onTouchStart={startHold}
                      onTouchEnd={cancelHold}
                      aria-label="Press and hold for 2 seconds to activate SOS"
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px var(--space-3)',
                        fontSize: '0.92rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      {/* Hold progress bar fill */}
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${holdProgress}%`,
                          backgroundColor: 'rgba(255, 255, 255, 0.35)',
                          transition: 'width 50ms linear',
                        }}
                      />
                      <span style={{ position: 'relative', zIndex: 1 }}>
                        {holdProgress > 0 ? `Hold (${holdProgress}%)...` : '🚨 Press & Hold SOS (2s)'}
                      </span>
                    </button>

                    {/* Accessible Modal Trigger for keyboard / assistive tech */}
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={handleOpenSosModal}
                      style={{
                        borderColor: '#ef4444',
                        color: '#f87171',
                        fontSize: '0.82rem',
                        whiteSpace: 'nowrap',
                      }}
                      title="Accessible modal trigger"
                    >
                      Open SOS Modal
                    </Button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 600 }}>
                    In-App SOS is currently active.
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleOpenResolveSosModal}
                    style={{ borderColor: '#10b981', color: '#34d399', fontWeight: 700 }}
                  >
                    ✅ Resolve SOS State (I Am Safe)
                  </Button>
                </div>
              )}

              {/* Public Helplines List */}
              <div
                style={{
                  background: 'var(--color-surface-card)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  padding: 'var(--space-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  marginTop: 'var(--space-1)',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  CHENNAI EMERGENCY HELPLINES DIRECTORY
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.74rem' }}>
                  {helplines.slice(0, 4).map((h, idx) => (
                    <a
                      key={idx}
                      href={h.dial_uri || h.dialUri || `tel:${h.number}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        background: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: '3px',
                        color: 'var(--color-text-primary)',
                        textDecoration: 'none',
                        border: '1px solid var(--color-border-subtle)',
                      }}
                      title={`Call ${h.name}`}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.category || h.name}
                      </span>
                      <strong style={{ color: 'var(--color-brand-cyan)' }}>{h.number}</strong>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </SectionPanel>

          {/* Location Privacy & Sharing (Step 5) */}
          <SectionPanel
            title="Location Privacy & Coordinates"
            subtitle="Consent-based location access; local processing only"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Toggle Location Sharing */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Share Live Location
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    Off by default. Used locally to place marker on route.
                  </div>
                </div>

                <input
                  type="checkbox"
                  id="toggle-location-sharing"
                  checked={locationSharingEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setLocationSharingEnabled(enabled);
                    saveJourneySettings({ ...initialSettings, locationSharingEnabled: enabled });
                  }}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--color-brand-blue)' }}
                />
              </div>

              {/* Privacy Notice */}
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-text-secondary)',
                  background: 'rgba(15, 23, 42, 0.4)',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                🔒 <strong>Privacy Guarantee:</strong> Browser coordinates remain strictly in your local device memory.
                They are never transmitted to public servers or stored remotely.
              </div>

              {/* Status and Demo Mode Controls */}
              {locationSharingEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>GPS Status:</span>
                    <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                      {effectiveLocationStatus}
                    </span>
                  </div>

                  {/* Demo Simulation Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid var(--color-border-subtle)' }}>
                    <div>
                      <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        Demo Mode Progression
                      </span>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                        Simulates movement along corridor for review
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id="toggle-demo-mode"
                      checked={isDemoMode}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setIsDemoMode(val);
                        saveJourneySettings({ ...initialSettings, isDemoMode: val });
                      }}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </SectionPanel>

          {/* Trusted Contacts Panel (Local Prototype) */}
          <SectionPanel
            title="Trusted Contacts (Local Prototype)"
            subtitle="Optional emergency contacts stored locally in this browser"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {trustedContacts.length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                  No trusted contacts configured. Add contacts to display shortcuts during travel.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {trustedContacts.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--color-surface-card)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--color-border-subtle)',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{c.phone}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <a
                          href={`tel:${c.phone}`}
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--color-brand-cyan)',
                            textDecoration: 'none',
                            padding: '2px 6px',
                            background: 'rgba(56, 189, 248, 0.1)',
                            borderRadius: '3px',
                          }}
                        >
                          📞 Call
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(c.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                          title="Remove contact"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add contact form */}
              {showContactForm ? (
                <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <TextInput
                    id="contact-name"
                    label="Contact Name"
                    value={newContactName}
                    onChange={(val) => setNewContactName(val)}
                    placeholder="e.g. Family Member"
                    required
                  />
                  <TextInput
                    id="contact-phone"
                    label="Phone Number"
                    value={newContactPhone}
                    onChange={(val) => setNewContactPhone(val)}
                    placeholder="e.g. +91 98765 43210"
                    required
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Button type="submit" variant="primary" size="sm">
                      Save Contact
                    </Button>
                    <Button type="button" variant="subtle" size="sm" onClick={() => setShowContactForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                trustedContacts.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowContactForm(true)}
                    style={{ fontSize: '0.74rem' }}
                  >
                    + Add Trusted Contact
                  </Button>
                )
              )}
            </div>
          </SectionPanel>

          {/* Minimal Event History Ledger (Step 7) */}
          <SectionPanel
            title="Journey Event Ledger"
            subtitle="Minimal chronological audit log of journey checkpoints"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {eventHistory.length === 0 ? (
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                  No events recorded yet. Start monitoring to log lifecycle checkpoints.
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  {eventHistory.map((evt, idx) => (
                    <div
                      key={evt.event_id || idx}
                      style={{
                        background: 'var(--color-surface-card)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '6px 8px',
                        fontSize: '0.73rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <strong
                          style={{
                            color:
                              evt.event_type.includes('SOS')
                                ? '#f87171'
                                : evt.event_type.includes('MISSED')
                                ? '#fbbf24'
                                : evt.event_type.includes('COMPLETED')
                                ? '#34d399'
                                : 'var(--color-text-primary)',
                          }}
                        >
                          {evt.event_type}
                        </strong>
                        <span style={{ fontSize: '0.66rem', color: 'var(--color-text-muted)' }}>
                          {evt.timestamp_ist}
                        </span>
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)' }}>{evt.summary}</div>
                    </div>
                  ))}
                </div>
              )}

              {eventHistory.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.68rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Clear Local History
                  </button>
                </div>
              )}
            </div>
          </SectionPanel>
        </div>

        {/* Right Column: Interactive Map with Route & Commuter Pin (Step 6) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minHeight: '620px', minWidth: 0 }}>
          <MapWorkspace
            origin={origin}
            destination={destination}
            currentLocation={activePosition}
            activeCorridor="Chennai Demonstration Corridor"
            selectedRouteType={routeType}
            routes={activeRoute ? [activeRoute] : []}
            selectedRouteId={activeRoute?.route_id || null}
            onSelectRoute={onSelectRoute}
          />
        </div>
      </div>

      {/* SOS Modal Dialog */}
      <SosConfirmationModal
        isOpen={sosModalOpen}
        mode={sosModalMode}
        onConfirm={handleConfirmSosModal}
        onCancel={() => setSosModalOpen(false)}
      />

      <style>{`
        @media (max-width: 960px) {
          .journey-monitoring-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

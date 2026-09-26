import React, { useState, useEffect } from 'react';
import { fetchSystemHealth } from '../../api/health';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export function ServiceStatusBar() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSystemHealth();
      setHealthData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
      setHealthData(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div style={{
      background: 'var(--bg-surface-elevated)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '0.6rem 2rem',
      fontSize: '0.82rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>System Telemetry:</span>

        {loading ? (
          <Badge variant="warning" pulse={true}>
            Probing Backend API...
          </Badge>
        ) : healthData ? (
          <>
            <Badge variant="healthy" pulse={true}>
              API: ONLINE (v{healthData.version})
            </Badge>
            <Badge variant={healthData.database.connected ? 'healthy' : 'danger'}>
              Database: {healthData.database.database_type.toUpperCase()} ({healthData.database.status})
            </Badge>
            <span style={{ color: 'var(--text-secondary)' }}>
              City: <strong>{healthData.city_context}</strong>
            </span>
          </>
        ) : (
          <Badge variant="danger" pulse={true}>
            API: DISCONNECTED
          </Badge>
        )}

        {lastChecked && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Last checked: {lastChecked}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {error && (
          <span style={{ color: '#f87171', fontSize: '0.78rem', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={error}>
            ⚠️ {error}
          </span>
        )}
        <Button
          variant="secondary"
          onClick={checkHealth}
          disabled={loading}
          style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
        >
          {loading ? 'Checking...' : '🔄 Refresh Health'}
        </Button>
      </div>
    </div>
  );
}

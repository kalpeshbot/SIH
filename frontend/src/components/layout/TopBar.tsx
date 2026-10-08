import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Sun, Moon } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';
import { useTheme } from '../../context/ThemeContext';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle }) => {
  const { backendConnected, lastSyncTime, refreshSystem } = useSystem();
  const { theme, toggleTheme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSystem();
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'No sync recorded';
    return date.toTimeString().split(' ')[0];
  };

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-main)',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>{title}</h1>
        {subtitle && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Backend Connectivity Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.6rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            backgroundColor: backendConnected ? 'var(--state-normal-bg)' : 'var(--state-danger-bg)',
            color: backendConnected ? 'var(--state-normal-text)' : 'var(--state-danger-text)',
            border: `1px solid ${backendConnected ? 'var(--state-normal-border)' : 'var(--state-danger-border)'}`,
          }}
          title={backendConnected ? 'Connected to FastAPI backend' : 'Backend connection unavailable'}
        >
          {backendConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span>{backendConnected ? 'BACKEND: CONNECTED' : 'BACKEND: OFFLINE'}</span>
        </div>

        {/* Last Sync Timestamp */}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Sync: {formatSyncTime(lastSyncTime)}
        </div>

        {/* Refresh Action */}
        <button
          type="button"
          className="btn btn-secondary btn-icon btn-sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh backend telemetry"
          title="Refresh telemetry data"
        >
          <RefreshCw size={14} style={{ transform: isRefreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          className="btn btn-secondary btn-icon btn-sm"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>
      </div>
    </header>
  );
};

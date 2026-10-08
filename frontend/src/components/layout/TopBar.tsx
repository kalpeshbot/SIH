import React, { useState } from 'react';
import { RefreshCw, Sun, Moon } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';
import { useTheme } from '../../context/ThemeContext';

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, actions }) => {
  const { backendConnected, lastSyncTime, refreshSystem } = useSystem();
  const { theme, toggleTheme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSystem();
    } finally {
      setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  const formatSyncTime = (date: Date | null) => {
    if (!date) return '--:--:--';
    return date.toTimeString().slice(0, 8);
  };

  return (
    <header
      style={{
        height: '52px',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-main)',
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexShrink: 0,
      }}
    >
      {/* Page title */}
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Right side controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        {/* Custom page-level actions */}
        {actions}

        {/* Backend connection indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.22rem 0.55rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            backgroundColor: backendConnected
              ? 'var(--state-normal-bg)'
              : 'var(--state-danger-bg)',
            color: backendConnected
              ? 'var(--state-normal-text)'
              : 'var(--state-danger-text)',
            border: `1px solid ${
              backendConnected
                ? 'var(--state-normal-border)'
                : 'var(--state-danger-border)'
            }`,
          }}
          title={
            backendConnected
              ? 'FastAPI backend is reachable'
              : 'Backend connection unavailable'
          }
          role="status"
          aria-label={backendConnected ? 'Backend connected' : 'Backend offline'}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: backendConnected
                ? 'var(--state-normal-dot)'
                : 'var(--state-danger-dot)',
              flexShrink: 0,
            }}
          />
          {backendConnected ? 'API OK' : 'OFFLINE'}
        </div>

        {/* Last sync timestamp */}
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
          title="Last data sync"
        >
          {formatSyncTime(lastSyncTime)}
        </div>

        {/* Refresh */}
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh data"
          title="Refresh"
        >
          <RefreshCw
            size={13}
            style={{
              transform: isRefreshing ? 'rotate(180deg)' : 'none',
              transition: isRefreshing ? 'transform 0.35s ease' : 'none',
            }}
          />
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`${theme === 'light' ? 'Dark' : 'Light'} mode`}
        >
          {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
        </button>
      </div>
    </header>
  );
};

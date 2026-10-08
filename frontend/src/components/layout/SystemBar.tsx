import React from 'react';
import { Database, Server, Clock } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

export const SystemBar: React.FC = () => {
  const { backendConnected, databaseConnected, pollingIntervalMs } = useSystem();

  return (
    <footer
      role="contentinfo"
      aria-label="System status"
      style={{
        padding: '0.28rem 1.25rem',
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.68rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Server
            size={11}
            color={backendConnected ? 'var(--state-normal-dot)' : 'var(--state-danger-dot)'}
          />
          <span>API: {backendConnected ? 'Online' : 'Offline'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Database
            size={11}
            color={databaseConnected ? 'var(--state-normal-dot)' : 'var(--state-danger-dot)'}
          />
          <span>DB: {databaseConnected ? 'SQLite OK' : 'Offline'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Clock size={11} />
          <span>Poll: {pollingIntervalMs / 1000}s</span>
        </div>
      </div>
      <span>SIH Safety Monitor - Demo Prototype</span>
    </footer>
  );
};

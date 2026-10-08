import React from 'react';
import { Database, Server, Clock } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

export const SystemBar: React.FC = () => {
  const { backendConnected, databaseConnected, pollingIntervalMs } = useSystem();

  return (
    <div
      style={{
        padding: '0.4rem 1.5rem',
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Server size={12} color={backendConnected ? 'var(--state-normal-text)' : 'var(--state-danger-text)'} />
          <span>API: {backendConnected ? 'ONLINE' : 'UNREACHABLE'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Database size={12} color={databaseConnected ? 'var(--state-normal-text)' : 'var(--state-danger-text)'} />
          <span>DATABASE: {databaseConnected ? 'SQLITE OK' : 'OFFLINE'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Clock size={12} />
          <span>POLL RATE: {pollingIntervalMs / 1000}s</span>
        </div>
      </div>
      <div>
        <span>DEMO / TRAINING PROTOTYPE</span>
      </div>
    </div>
  );
};

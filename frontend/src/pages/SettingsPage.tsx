import React from 'react';
import { TopBar } from '../components/layout/TopBar';
import { useTheme } from '../context/ThemeContext';
import { useSystem } from '../context/SystemContext';
import { Settings, Moon, Sun, Clock, Server, Info, Shield } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { pollingIntervalMs, setPollingIntervalMs, backendConnected, databaseConnected } = useSystem();

  return (
    <>
      <TopBar
        title="System & Platform Settings"
        subtitle="Configure appearance, telemetry polling rates, and review technical build metadata"
      />

      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
        {/* Appearance Settings */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={16} color="var(--primary)" />
              <span className="card-title">User Interface Appearance</span>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Select your preferred visual mode for workshop monitoring. Preference is persisted in local browser storage.
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTheme('light')}
                style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
              >
                <Sun size={16} />
                Light Mode
              </button>

              <button
                type="button"
                className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTheme('dark')}
                style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
              >
                <Moon size={16} />
                Dark Mode
              </button>
            </div>
          </div>
        </div>

        {/* Telemetry Polling Rate */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="var(--primary)" />
              <span className="card-title">Live Telemetry Polling Interval</span>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Configure how frequently the dashboard queries the FastAPI backend for new sensor readings and hazard alerts.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                { label: '2 Seconds (High Rate)', value: 2000 },
                { label: '4 Seconds (Standard)', value: 4000 },
                { label: '8 Seconds (Low Overhead)', value: 8000 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`btn ${pollingIntervalMs === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPollingIntervalMs(opt.value)}
                  style={{ justifyContent: 'center', fontSize: '0.8rem' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Backend & Environment Diagnostics */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Server size={16} color="var(--primary)" />
              <span className="card-title">Service Connection Status</span>
            </div>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="data-table">
                <tbody>
                  <tr>
                    <td style={{ width: '35%', color: 'var(--text-muted)' }}>Backend API Endpoint</td>
                    <td className="mono">
                      {import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000 (Proxy)'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>FastAPI Gateway State</td>
                    <td>
                      {backendConnected ? (
                        <span className="badge badge-normal">CONNECTED</span>
                      ) : (
                        <span className="badge badge-danger">UNREACHABLE</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>Database Layer</td>
                    <td>
                      {databaseConnected ? (
                        <span className="badge badge-normal">SQLITE OPERATIONAL</span>
                      ) : (
                        <span className="badge badge-danger">DATABASE OFFLINE</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* About & Technical Specifications */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} color="var(--primary)" />
              <span className="card-title">Technical Specifications & Version</span>
            </div>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="data-table">
                <tbody>
                  <tr>
                    <td style={{ width: '35%', color: 'var(--text-muted)' }}>Application Name</td>
                    <td style={{ fontWeight: 600 }}>SIH Vocational Training Safety Monitor</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>Release Version</td>
                    <td className="mono">0.1.0-prototype</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>Frontend Framework</td>
                    <td>React 19 + TypeScript + Vite</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>Backend Stack</td>
                    <td>FastAPI + SQLModel + Python 3.11</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>Telemetry Database</td>
                    <td>SQLite 3 with ACID Transaction Support</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-muted)' }}>Hardware Protocol</td>
                    <td>HTTP REST / JSON Ingestion (/api/readings)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-main)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Shield size={16} color="var(--primary)" />
              <span>
                Academic Prototype - Developed for Smart India Hackathon vocational training safety demonstration.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

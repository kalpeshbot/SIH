import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  PlaySquare,
  Users,
  Radio,
  MapPin,
  AlertTriangle,
  Settings,
  FileText,
} from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

export const Sidebar: React.FC = () => {
  const { activeAlertsCount } = useSystem();

  const navItems = [
    { to: '/',         label: 'Dashboard', icon: <Activity size={15} />,      end: true },
    { to: '/sessions', label: 'Sessions',  icon: <PlaySquare size={15} /> },
    { to: '/trainees', label: 'Trainees',  icon: <Users size={15} /> },
    { to: '/devices',  label: 'Devices',   icon: <Radio size={15} /> },
    { to: '/zones',    label: 'Zones',     icon: <MapPin size={15} /> },
    {
      to: '/alerts',
      label: 'Alerts',
      icon: <AlertTriangle size={15} />,
      badge: activeAlertsCount > 0 ? activeAlertsCount : null,
    },
  ];

  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.42rem 0.7rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8125rem',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--primary-text)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--primary-subtle)' : 'transparent',
    border: `1px solid ${isActive ? 'var(--primary-border)' : 'transparent'}`,
    textDecoration: 'none',
    transition: 'background-color 0.1s ease, color 0.1s ease',
  });

  return (
    <aside
      aria-label="Main navigation"
      style={{
        width: '216px',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-main)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: '0.875rem 0.875rem 0.75rem',
          borderBottom: '1px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: '0.825rem',
            color: 'var(--text-primary)',
            letterSpacing: '0.05em',
            lineHeight: 1.2,
          }}
        >
          MORD
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.6rem 0.5rem', overflowY: 'auto' }}>
        <div
          style={{
            padding: '0.2rem 0.7rem 0.4rem',
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--text-muted)',
          }}
        >
          Operations
        </div>

        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                style={({ isActive }) => linkStyle(isActive)}
              >
                <span style={{ display: 'flex', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge != null && (
                  <span
                    style={{
                      backgroundColor: 'var(--state-danger-dot)',
                      color: '#fff',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '0 5px',
                      height: '16px',
                      lineHeight: '16px',
                      borderRadius: 'var(--radius-xs)',
                      minWidth: '16px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div
          style={{
            marginTop: '1rem',
            padding: '0.2rem 0.7rem 0.4rem',
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--text-muted)',
          }}
        >
          System
        </div>

        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <li>
            <NavLink
              to="/settings"
              style={({ isActive }) => linkStyle(isActive)}
            >
              <Settings size={15} />
              <span>Settings</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '0.65rem 0.875rem',
          borderTop: '1px solid var(--border-muted)',
          backgroundColor: 'var(--bg-subtle)',
        }}
      >
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            marginBottom: '0.4rem',
            lineHeight: 1.4,
          }}
        >
          Vocational Safety Prototype
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <NavLink
            to="/privacy"
            style={{
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <FileText size={11} />
            Privacy
          </NavLink>
          <span style={{ color: 'var(--border-muted)', fontSize: '0.7rem' }}>|</span>
          <NavLink
            to="/terms"
            style={{
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <FileText size={11} />
            Terms
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

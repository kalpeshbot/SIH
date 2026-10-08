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
  Shield,
  FileText,
} from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

export const Sidebar: React.FC = () => {
  const { activeAlertsCount } = useSystem();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <Activity size={18} /> },
    { to: '/sessions', label: 'Sessions', icon: <PlaySquare size={18} /> },
    { to: '/trainees', label: 'Trainees', icon: <Users size={18} /> },
    { to: '/devices', label: 'Devices', icon: <Radio size={18} /> },
    { to: '/zones', label: 'Zones', icon: <MapPin size={18} /> },
    {
      to: '/alerts',
      label: 'Alerts',
      icon: <AlertTriangle size={18} />,
      badge: activeAlertsCount > 0 ? activeAlertsCount : null,
    },
  ];

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-main)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
      aria-label="Main Navigation"
    >
      {/* Brand / Header */}
      <div
        style={{
          padding: '1.1rem 1.25rem',
          borderBottom: '1px solid var(--border-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--primary-subtle)',
            color: 'var(--primary)',
            padding: '0.4rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
          }}
        >
          <Shield size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            SIH Safety Monitor
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            PROTOTYPE v0.1.0
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav style={{ padding: '0.75rem 0.5rem', flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '0.25rem 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          Operations
        </div>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--primary-text)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--primary-subtle)' : 'transparent',
                  border: isActive ? '1px solid var(--primary-border)' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease',
                })}
              >
                <span>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge !== null && (
                  <span
                    style={{
                      backgroundColor: 'var(--state-danger-bg)',
                      color: 'var(--state-danger-text)',
                      border: '1px solid var(--state-danger-border)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-sm)',
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

        <div style={{ marginTop: '1.25rem', padding: '0.25rem 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          System
        </div>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <li>
            <NavLink
              to="/settings"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--primary-text)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--primary-subtle)' : 'transparent',
                border: isActive ? '1px solid var(--primary-border)' : '1px solid transparent',
                textDecoration: 'none',
              })}
            >
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Safety Notice & Footer Links */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid var(--border-main)',
          backgroundColor: 'var(--bg-subtle)',
          fontSize: '0.75rem',
        }}
      >
        <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
          Vocational Safety Prototype
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-muted)' }}>
          <NavLink to="/privacy" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <FileText size={12} /> Privacy
          </NavLink>
          <span style={{ color: 'var(--border-muted)' }}>|</span>
          <NavLink to="/terms" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <FileText size={12} /> Terms
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

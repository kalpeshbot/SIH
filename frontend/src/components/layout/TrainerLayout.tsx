import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PortalProvider } from '../../context/PortalContext';

export const TrainerLayout: React.FC = () => {
  return (
    <PortalProvider portal="TRAINER">
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: 'var(--bg-app)',
        }}
      >
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Column */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </PortalProvider>
  );
};

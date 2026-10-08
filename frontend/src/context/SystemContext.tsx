import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getHealth, getAlerts } from '../api/endpoints';
import { Alert } from '../api/types';

interface SystemContextType {
  backendConnected: boolean;
  databaseConnected: boolean;
  lastSyncTime: Date | null;
  activeAlertsCount: number;
  activeAlerts: Alert[];
  pollingIntervalMs: number;
  setPollingIntervalMs: (interval: number) => void;
  refreshSystem: () => Promise<void>;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [databaseConnected, setDatabaseConnected] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [pollingIntervalMs, setPollingIntervalState] = useState<number>(() => {
    const saved = localStorage.getItem('sih_poll_interval');
    return saved ? parseInt(saved, 10) : 5000;
  });

  const setPollingIntervalMs = (interval: number) => {
    setPollingIntervalState(interval);
    localStorage.setItem('sih_poll_interval', String(interval));
  };

  const refreshSystem = useCallback(async () => {
    try {
      const health = await getHealth();
      setBackendConnected(health.status === 'ok');
      setDatabaseConnected(health.database === 'connected');
      setLastSyncTime(new Date());

      // Fetch active unacknowledged alerts
      const alerts = await getAlerts({ acknowledged: false });
      setActiveAlerts(alerts);
    } catch {
      setBackendConnected(false);
      setDatabaseConnected(false);
    }
  }, []);

  useEffect(() => {
    refreshSystem();
    const timer = setInterval(refreshSystem, pollingIntervalMs);
    return () => clearInterval(timer);
  }, [refreshSystem, pollingIntervalMs]);

  return (
    <SystemContext.Provider
      value={{
        backendConnected,
        databaseConnected,
        lastSyncTime,
        activeAlertsCount: activeAlerts.length,
        activeAlerts,
        pollingIntervalMs,
        setPollingIntervalMs,
        refreshSystem,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};

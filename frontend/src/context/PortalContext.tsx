import React, { createContext, useContext } from 'react';

export type PortalType = 'TRAINEE' | 'TRAINER';

interface PortalContextType {
  portal: PortalType;
}

const PortalContext = createContext<PortalContextType>({ portal: 'TRAINER' });

export const PortalProvider: React.FC<{ portal: PortalType; children: React.ReactNode }> = ({
  portal,
  children,
}) => {
  return <PortalContext.Provider value={{ portal }}>{children}</PortalContext.Provider>;
};

export const usePortal = () => useContext(PortalContext);

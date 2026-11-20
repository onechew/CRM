import { createContext, useContext, type ReactNode } from 'react';
import { useCrm, type CrmApi } from '../hooks/useCrm';

const CrmContext = createContext<CrmApi | null>(null);

export function CrmProvider({ children }: { children: ReactNode }) {
  const api = useCrm();
  return <CrmContext.Provider value={api}>{children}</CrmContext.Provider>;
}

export function useCrmContext() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrmContext must be used within CrmProvider');
  return ctx;
}

import { createContext, useContext } from 'react';

export const BootstrapContext = createContext({
  refreshCompany: async () => {},
});

export function useBootstrap() {
  return useContext(BootstrapContext);
}

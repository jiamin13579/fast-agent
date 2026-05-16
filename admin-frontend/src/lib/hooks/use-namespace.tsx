"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "./use-auth";

interface NamespaceContextType {
  currentNamespaceId: number;
  switchNamespace: (id: number) => void;
}

const NamespaceContext = createContext<NamespaceContextType>({
  currentNamespaceId: 0,
  switchNamespace: () => {},
});

export const useNamespace = () => useContext(NamespaceContext);

export function NamespaceProvider({ children }: { children: ReactNode }) {
  const { isGlobalAdmin } = useAuth();
  const [currentNamespaceId, setCurrentId] = useState(isGlobalAdmin ? 0 : 0);

  const switchNamespace = useCallback((id: number) => {
    setCurrentId(id);
  }, []);

  return (
    <NamespaceContext.Provider
      value={{
        currentNamespaceId,
        switchNamespace,
      }}
    >
      {children}
    </NamespaceContext.Provider>
  );
}

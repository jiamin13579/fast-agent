"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getCurrentNamespaceId, setCurrentNamespaceId } from "@/lib/api/client";
import { useAuth } from "./use-auth";

interface NamespaceContextType {
  currentNamespaceId: number;
  namespaces: { id: number; name: string; role: string }[];
  switchNamespace: (id: number) => void;
}

const NamespaceContext = createContext<NamespaceContextType>({
  currentNamespaceId: 0,
  namespaces: [],
  switchNamespace: () => {},
});

export const useNamespace = () => useContext(NamespaceContext);

export function NamespaceProvider({ children }: { children: ReactNode }) {
  const { user, namespaces } = useAuth();
  const [currentNamespaceId, setCurrentId] = useState(0);

  useEffect(() => {
    if (user && namespaces.length > 0) {
      const saved = getCurrentNamespaceId();
      const valid = namespaces.find((ns) => ns.id === saved);
      if (valid) {
        setCurrentId(saved);
      } else {
        setCurrentId(namespaces[0].id);
        setCurrentNamespaceId(namespaces[0].id);
      }
    }
  }, [user, namespaces]);

  const switchNamespace = useCallback((id: number) => {
    setCurrentId(id);
    setCurrentNamespaceId(id);
  }, []);

  return (
    <NamespaceContext.Provider
      value={{
        currentNamespaceId,
        namespaces,
        switchNamespace,
      }}
    >
      {children}
    </NamespaceContext.Provider>
  );
}

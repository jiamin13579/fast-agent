"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getCurrentNamespaceId, setCurrentNamespaceId } from "@/lib/api/client";
import { useAuth } from "./use-auth";

interface NamespaceContextType {
  currentNamespaceId: number;
  namespaces: { id: number; name: string; role: string }[];
  isCurrentNsAdmin: boolean;
  switchNamespace: (id: number) => void;
}

const NamespaceContext = createContext<NamespaceContextType>({
  currentNamespaceId: 0,
  namespaces: [],
  isCurrentNsAdmin: false,
  switchNamespace: () => {},
});

export const useNamespace = () => useContext(NamespaceContext);

export function NamespaceProvider({ children }: { children: ReactNode }) {
  const { user, namespaces } = useAuth();
  const [currentNamespaceId, setCurrentId] = useState(0);

  useEffect(() => {
    if (user) {
      if (user.isAdmin) {
        setCurrentId(0);
        setCurrentNamespaceId(0);
      } else {
        const saved = getCurrentNamespaceId();
        const valid = namespaces.find((ns) => ns.id === saved);
        if (valid) {
          setCurrentId(saved);
        } else if (namespaces.length > 0) {
          setCurrentId(namespaces[0].id);
          setCurrentNamespaceId(namespaces[0].id);
        }
      }
    }
  }, [user, namespaces]);

  const switchNamespace = useCallback((id: number) => {
    setCurrentId(id);
    setCurrentNamespaceId(id);
  }, []);

  const currentNs = namespaces.find((ns) => ns.id === currentNamespaceId);
  const isCurrentNsAdmin = !user?.isAdmin && currentNs?.role === "ADMIN";

  return (
    <NamespaceContext.Provider
      value={{
        currentNamespaceId,
        namespaces,
        isCurrentNsAdmin,
        switchNamespace,
      }}
    >
      {children}
    </NamespaceContext.Provider>
  );
}

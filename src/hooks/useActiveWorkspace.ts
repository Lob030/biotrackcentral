import { useEffect, useState } from "react";
import { ACTIVE_WORKSPACE_KEY } from "@/lib/workspace";

interface ActiveWorkspaceState {
  workspaceId: string | null;
  isLoading: boolean;
}

export function useActiveWorkspace(): ActiveWorkspaceState {
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_WORKSPACE_KEY) {
        setWorkspaceId(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { workspaceId, isLoading: false };
}

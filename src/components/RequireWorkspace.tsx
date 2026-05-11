import { ReactNode } from "react";
import { useWorkspaceGuard } from "@/middleware/workspace-guard";
import PageLoader from "@/components/PageLoader";

interface RequireWorkspaceProps {
  children: ReactNode;
}

/**
 * Componente guard que protege rutas requiriendo que el usuario tenga al menos un workspace.
 * 
 * Comportamiento:
 * - Mientras loading === true → muestra skeleton/loader (evita redirect loops)
 * - Si !hasWorkspace → no renderiza children (el hook useWorkspaceGuard ya redirige a /onboarding)
 * - Si hasWorkspace === true → renderiza children normalmente
 */
export default function RequireWorkspace({ children }: RequireWorkspaceProps) {
  const { hasWorkspace, loading } = useWorkspaceGuard();

  if (loading) {
    return <PageLoader />;
  }

  // Si no tiene workspace, el hook useWorkspaceGuard ya se encarga de redirigir a /onboarding
  // Aquí simplemente no renderizamos los children hasta que la redirección ocurra
  if (!hasWorkspace) {
    return null;
  }

  return <>{children}</>;
}

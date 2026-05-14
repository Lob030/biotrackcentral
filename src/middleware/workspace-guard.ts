import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook que verifica si el usuario autenticado tiene al menos un workspace activo.
 * 
 * Comportamiento:
 * - Si no hay usuario → retorna { hasWorkspace: false, loading: true }
 * - Si hay usuario pero aún no se verificó workspaces → loading: true
 * - Si hay usuario y se verificó workspaces:
 *   - Si data.length === 0 → hasWorkspace: false
 *   - Si data.length > 0 → hasWorkspace: true
 * 
 * Efectos secundarios de navegación:
 * - Si !hasWorkspace && pathname !== '/onboarding' → navega a /onboarding
 * - Si hasWorkspace && pathname === '/onboarding' → navega a /dashboard
 */
export function useWorkspaceGuard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [hasWorkspace, setHasWorkspace] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Si auth está cargando, esperamos
    if (authLoading) {
      setLoading(true);
      return;
    }

    // Si no hay usuario, no verificamos workspaces
    if (!user) {
      setLoading(false);
      setHasWorkspace(false);
      return;
    }

    let cancelled = false;

    const checkWorkspace = async () => {
      try {
        // NOTE: la tabla `workspaces` aún no existe en el schema (se crea en el Prompt 2 de DB).
        // Hasta entonces hacemos cast a any para evitar romper el build de tipos.
        const { data, error } = await (supabase as any)
          .from("workspaces")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (cancelled) return;

        // Si la tabla no existe, el mock de localStorage define si tiene workspace
        const localWorkspace = localStorage.getItem('biotrack_active_workspace');
        
        if (localWorkspace) {
           setHasWorkspace(true);
        } else if (error || !data || data.length === 0) {
          setHasWorkspace(false);
        } else {
          setHasWorkspace(true);
        }
      } catch {
        // Error inesperado, asumimos sin workspace
        if (!cancelled) {
          setHasWorkspace(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkWorkspace();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Efecto para redirecciones una vez que sabemos el estado del workspace
  useEffect(() => {
    if (loading) return; // No redirigir mientras cargamos

    const currentPath = location.pathname;

    if (!hasWorkspace && currentPath !== "/onboarding") {
      // Usuario sin workspace intentando acceder a otra ruta → forzar onboarding
      navigate("/onboarding", { replace: true });
    }
    // Note: We removed the auto-redirect from /onboarding to /dashboard 
    // to allow the "Agregar nuevo" flow from the Hub.

  }, [hasWorkspace, loading, location.pathname, navigate]);

  return { hasWorkspace, loading };
}

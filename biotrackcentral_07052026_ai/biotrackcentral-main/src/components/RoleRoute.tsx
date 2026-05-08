import { Navigate } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import PageLoader from "./PageLoader";

interface Props {
  children: React.ReactNode;
  /** Roles allowed to view this route. If user is super_admin, always allowed. */
  allow: AppRole[];
  /** Where to redirect when not authorized. */
  redirectTo?: string;
}

/**
 * Centralized role-based guard. Keeps existing `Navigate to="/dashboard"` patterns
 * out of individual page components. Use within ProtectedRoute children.
 */
export default function RoleRoute({ children, allow, redirectTo = "/dashboard" }: Props) {
  const { role, isSuperAdmin, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (isSuperAdmin) return <>{children}</>;
  if (role && allow.includes(role)) return <>{children}</>;
  return <Navigate to={redirectTo} replace />;
}

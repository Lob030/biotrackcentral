import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FlaskConical } from "lucide-react";

export default function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow animate-pulse-glow">
            <FlaskConical className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

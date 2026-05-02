import { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PlanTier } from "@/hooks/useAuth";
import { PLAN_LABELS } from "@/hooks/usePlan";

interface PlanGateProps {
  /** Mínimo plan requerido para acceder */
  requires: PlanTier;
  /** Contenido protegido */
  children: ReactNode;
  /** Título mostrado en overlay */
  title?: string;
  /** Descripción mostrada en overlay */
  description?: string;
}

const RANK: Record<PlanTier, number> = { free: 0, basico: 1, profesional: 2, enterprise: 3 };

export function PlanGate({ requires, children, title, description }: PlanGateProps) {
  const { plan, isSuperAdmin } = usePlan();
  const allowed = isSuperAdmin || RANK[plan] >= RANK[requires];

  if (allowed) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-md opacity-40" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border bg-card/95 backdrop-blur-sm shadow-elegant p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow mb-4">
            <Lock className="h-7 w-7 text-primary-foreground" />
          </div>
          <Badge variant="secondary" className="mb-3">
            <Sparkles className="h-3 w-3 mr-1" />
            Requiere {PLAN_LABELS[requires]}
          </Badge>
          <h2 className="text-xl font-bold mb-2">{title ?? "Función premium"}</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {description ??
              `Esta sección está disponible a partir del plan ${PLAN_LABELS[requires]}. Tu plan actual es ${PLAN_LABELS[plan]}.`}
          </p>
          <Button className="w-full" onClick={() => window.alert("Pronto: flujo de upgrade")}>
            Actualizar mi plan
          </Button>
        </div>
      </div>
    </div>
  );
}

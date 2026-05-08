import { useAuth, type PlanTier } from "@/hooks/useAuth";

const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  basico: 1,
  profesional: 2,
  enterprise: 3,
};

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Free",
  basico: "Básico",
  profesional: "Profesional",
  enterprise: "Enterprise",
};

export function planAtLeast(plan: PlanTier, min: PlanTier) {
  return TIER_RANK[plan] >= TIER_RANK[min];
}

export function usePlan() {
  const { organization, isSuperAdmin } = useAuth();
  const plan: PlanTier = (organization?.plan as PlanTier) ?? "free";

  const expira = organization?.plan_expira_en ?? null;
  const expirado = expira ? new Date(expira) < new Date() : false;
  // If expired and was a trial, fall back to free for gating
  const efectivo: PlanTier = !isSuperAdmin && expirado && organization?.plan_gratis_trial ? "free" : plan;

  const puedeAcceder = {
    analytics: isSuperAdmin || planAtLeast(efectivo, "profesional"),
    reporteReprod: isSuperAdmin || planAtLeast(efectivo, "profesional"),
    asistente_ia: isSuperAdmin || efectivo === "enterprise",
    sinLimites: isSuperAdmin || efectivo === "enterprise",
  };

  const limites = {
    lotes: isSuperAdmin
      ? Infinity
      : efectivo === "free"
      ? 3
      : efectivo === "basico"
      ? 15
      : efectivo === "profesional"
      ? 50
      : Infinity,
    pedidos: isSuperAdmin
      ? Infinity
      : efectivo === "free"
      ? 10
      : efectivo === "basico"
      ? 50
      : Infinity,
    clientes: isSuperAdmin
      ? Infinity
      : efectivo === "free"
      ? 5
      : efectivo === "basico"
      ? 25
      : Infinity,
  };

  return {
    plan: efectivo,
    planRaw: plan,
    planLabel: PLAN_LABELS[efectivo],
    isSuperAdmin,
    expirado,
    puedeAcceder,
    limites,
  };
}

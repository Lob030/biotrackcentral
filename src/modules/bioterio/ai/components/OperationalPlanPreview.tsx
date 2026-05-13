import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  DESTRUCTIVE_INTENTS,
  INTENT_LABELS,
  type Confidence,
  type IntentName,
} from "../intents";
import type { PlanResponse } from "../client";

interface Props {
  plan: PlanResponse | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onPickCandidate?: (field: string, optionLabel: string) => void;
  isExecuting: boolean;
}

const CONFIDENCE_COLORS: Record<Confidence, string> = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  low: "bg-destructive/15 text-destructive",
};

export default function OperationalPlanPreview({
  plan,
  open,
  onClose,
  onConfirm,
  onPickCandidate,
  isExecuting,
}: Props) {
  const confirm = useConfirm();
  if (!plan) return null;

  const op = plan.operation;
  const isDestructive = op ? DESTRUCTIVE_INTENTS.has(op.intent as IntentName) : false;
  const hasErrors = (op?.validationErrors?.length ?? 0) > 0;

  const handleExecute = async () => {
    if (!op || hasErrors) return;
    if (isDestructive) {
      const ok = await confirm({
        title: "Confirmar acción destructiva",
        description: "Esta operación modifica datos existentes y no se puede deshacer.",
        confirmLabel: "Sí, ejecutar",
        cancelLabel: "Cancelar",
        tone: "destructive",
      });
      if (!ok) return;
    }
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isExecuting && !o && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="display-font flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            {plan.status === "ok" ? "Revisa el plan" : plan.status === "needs_disambiguation" ? "Aclaración requerida" : "Operación no válida"}
          </DialogTitle>
          <DialogDescription>
            {plan.status === "ok"
              ? "El asistente preparó esta operación. Revisa los efectos antes de ejecutar."
              : plan.reason ?? "El asistente no pudo proceder con la instrucción."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          {plan.status === "ok" && op && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{INTENT_LABELS[op.intent as IntentName]}</span>
                <span
                  className={`text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 ${CONFIDENCE_COLORS[op.confidence]}`}
                >
                  {op.confidence === "high" ? "alta" : op.confidence === "medium" ? "media" : "baja"} confianza
                </span>
                {isDestructive && (
                  <span className="text-[10px] uppercase tracking-wider rounded bg-destructive/15 text-destructive px-1.5 py-0.5">
                    destructiva
                  </span>
                )}
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1.5">
                {op.preview.lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin cambios visibles.</p>
                ) : (
                  op.preview.lines.map((line, i) => (
                    <p key={i} className="text-sm font-mono tabular-nums">{line}</p>
                  ))
                )}
              </div>

              {op.warnings.length > 0 && (
                <ul className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
                  {op.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              )}

              {hasErrors && (
                <ul className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-1">
                  {op.validationErrors.map((e, i) => (
                    <li key={i} className="text-xs text-destructive flex items-start gap-1.5">
                      <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {e}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {plan.status === "needs_disambiguation" && (
            <div className="space-y-3">
              {(plan.candidates ?? []).map((cand) => (
                <div key={cand.field} className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Elegir {cand.field}
                  </p>
                  <div className="grid gap-2">
                    {cand.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onPickCandidate?.(cand.field, opt.label)}
                        className="text-left rounded-lg border border-border/60 bg-card hover:bg-muted/40 px-3 py-2 transition-colors"
                      >
                        <div className="text-sm font-medium">{opt.label}</div>
                        {opt.hint && <div className="text-xs text-muted-foreground">{opt.hint}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {plan.status === "invalid" && (
            <div className="text-center py-8 space-y-2">
              <XCircle className="h-10 w-10 mx-auto text-destructive opacity-70" />
              <p className="text-sm text-muted-foreground">{plan.reason}</p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isExecuting}>
            Cerrar
          </Button>
          {plan.status === "ok" && op && (
            <Button
              onClick={handleExecute}
              disabled={isExecuting || hasErrors}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              {isExecuting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Ejecutando…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Ejecutar operación</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

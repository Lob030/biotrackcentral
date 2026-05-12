import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { PlanResponse } from "@/lib/ai/client";
import { DESTRUCTIVE_INTENTS, INTENT_LABELS, type IntentName } from "@/lib/ai/schemas";

interface Props {
  plan: PlanResponse | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (approvedIds: string[]) => void;
  isExecuting: boolean;
}

export default function AIPlanPreview({ plan, open, onClose, onConfirm, isExecuting }: Props) {
  const confirm = useConfirm();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (plan) setSelected(new Set(plan.operations.map((o) => o.id)));
  }, [plan]);

  if (!plan) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toExecute = plan.operations.filter((o) => selected.has(o.id));
  const hasDestructive = toExecute.some((o) =>
    DESTRUCTIVE_INTENTS.has(o.intent as IntentName),
  );

  const handleExecute = async () => {
    if (toExecute.length === 0) return;
    if (hasDestructive) {
      const ok = await confirm({
        title: "Confirmar acciones destructivas",
        description: `${toExecute.length} operación(es) seleccionada(s) modificarán datos existentes (mortalidad, traslado o división). ¿Continuar?`,
        confirmText: "Sí, ejecutar",
        cancelText: "Cancelar",
        variant: "destructive",
      });
      if (!ok) return;
    }
    onConfirm(toExecute.map((o) => o.id));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isExecuting && !o && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="display-font flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Revisa el plan antes de ejecutar
          </DialogTitle>
          <DialogDescription>
            El agente preparó {plan.operations.length} operación(es) válidas
            {plan.invalid.length > 0 ? ` y descartó ${plan.invalid.length}.` : "."}
            {" "}Selecciona las que quieres ejecutar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-2">
            {plan.operations.map((op) => {
              const isDestructive = DESTRUCTIVE_INTENTS.has(op.intent as IntentName);
              const label = INTENT_LABELS[op.intent as IntentName] ?? op.intent;
              return (
                <label
                  key={op.id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <Checkbox
                    checked={selected.has(op.id)}
                    onCheckedChange={() => toggle(op.id)}
                    disabled={isExecuting}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{label}</span>
                      {isDestructive && (
                        <span className="text-[10px] uppercase tracking-wider rounded bg-destructive/15 text-destructive px-1.5 py-0.5">
                          Destructiva
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{op.preview}</p>
                    {op.warnings.length > 0 && (
                      <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                        {op.warnings.map((w, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </label>
              );
            })}

            {plan.invalid.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 mt-3">
                <p className="text-xs uppercase tracking-wider text-destructive font-medium mb-2 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Operaciones rechazadas
                </p>
                <ul className="space-y-1">
                  {plan.invalid.map((inv) => (
                    <li key={inv.id} className="text-xs text-muted-foreground">
                      <span className="font-medium">{inv.intent ?? "desconocido"}:</span> {inv.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {plan.operations.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Ninguna operación válida para ejecutar.
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isExecuting}>
            Cancelar
          </Button>
          <Button
            onClick={handleExecute}
            disabled={isExecuting || toExecute.length === 0}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            {isExecuting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Ejecutando…</>
            ) : (
              <>Ejecutar {toExecute.length} operación(es)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

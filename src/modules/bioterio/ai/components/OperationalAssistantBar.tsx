import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAIAssistantStore } from "../state";
import { planAction, logExecutionResult } from "../client";
import OperationalPlanPreview from "./OperationalPlanPreview";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useWorkflowActions } from "../../workflows/hooks/useWorkflowActions";
import { executeOperation } from "../executor";
import { useState } from "react";

const EXAMPLES = [
  "Mover ASF-22 a B12",
  "Registrar 3 mortalidades en ASF-22",
  "Dividir ASF-22 en 10 machos y 12 hembras",
];

export default function OperationalAssistantBar() {
  const qc = useQueryClient();
  const { workspaceId } = useActiveWorkspace();
  const { user } = useAuth();
  const {
    isPlanning,
    isExecutingPlan,
    currentPlan,
    setPlanning,
    setExecuting,
    setPlan,
    reset,
  } = useAIAssistantStore();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Workflow actions need a context; fall back to safe defaults if no workspace.
  const actions = useWorkflowActions({
    workspaceId: workspaceId ?? "",
    instanceId: workspaceId ?? "",
    userId: user?.id ?? "",
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const submit = async (override?: string) => {
    const t = (override ?? text).trim();
    if (!t || isPlanning || isExecutingPlan) return;
    if (!workspaceId) {
      toast.error("Selecciona un entorno antes de usar el asistente.");
      return;
    }
    setPlanning(true);
    try {
      const result = await planAction(t, workspaceId);
      setPlan(result);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setPlanning(false);
    }
  };

  const handleClose = () => {
    if (isExecutingPlan) return;
    if (currentPlan) {
      // Mark as cancelled for audit
      void logExecutionResult(currentPlan.planId, {
        executionStatus: "cancelled",
        executionDurationMs: 0,
      });
    }
    reset();
    setText("");
  };

  const handleConfirm = async () => {
    if (!currentPlan?.operation || isExecutingPlan) return;
    setExecuting(true);
    const start = performance.now();
    try {
      const res = await executeOperation(currentPlan.operation, actions);
      const duration = Math.round(performance.now() - start);

      if (res.success) {
        toast.success("Operación ejecutada correctamente.");
        await logExecutionResult(currentPlan.planId, {
          executionStatus: "executed",
          executionDurationMs: duration,
          result: res.data ?? null,
        });
        // Refresh dashboard / projections
        qc.invalidateQueries();
      } else {
        toast.error(res.error ?? "Error al ejecutar la operación.");
        await logExecutionResult(currentPlan.planId, {
          executionStatus: "failed",
          executionDurationMs: duration,
          validationErrors: [res.error ?? "Unknown error"],
        });
      }
      reset();
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido");
      await logExecutionResult(currentPlan.planId, {
        executionStatus: "failed",
        executionDurationMs: Math.round(performance.now() - start),
        validationErrors: [e instanceof Error ? e.message : "Unknown error"],
      });
    } finally {
      setExecuting(false);
    }
  };

  const handlePickCandidate = (field: string, optionLabel: string) => {
    // Re-submit a clarified prompt, replacing ambiguous reference with explicit choice.
    const refined = `${text} (use ${field}=${optionLabel})`;
    setText(refined);
    setPlan(null);
    void submit(refined);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir asistente operativo"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-4 py-3 shadow-glow hover:opacity-90 transition-opacity"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium hidden sm:inline">Asistente</span>
        <kbd className="hidden md:inline ml-1 text-[10px] rounded bg-primary-foreground/20 px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={(o) => !isPlanning && setOpen(o)}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="display-font flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Asistente operativo
            </DialogTitle>
            <DialogDescription>
              Describe UNA acción operativa. El asistente prepara el plan, tú revisas y autorizas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder='Ej: "Mover ASF-22 a B12"'
              disabled={isPlanning || isExecutingPlan}
              rows={4}
              className="resize-y"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter para enviar · 1 comando = 1 acción</span>
              <Button
                onClick={() => void submit()}
                disabled={isPlanning || isExecutingPlan || !text.trim()}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                {isPlanning ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Planeando…</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Generar plan</>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ejemplos</p>
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="text-left text-xs rounded-lg border border-border/60 bg-muted/40 hover:bg-muted px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <OperationalPlanPreview
        plan={currentPlan}
        open={!!currentPlan}
        onClose={handleClose}
        onConfirm={handleConfirm}
        onPickCandidate={handlePickCandidate}
        isExecuting={isExecutingPlan}
      />
    </>
  );
}

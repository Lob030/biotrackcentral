import { useEffect, useRef, useState } from "react";
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
import AIPlanPreview from "./AIPlanPreview";
import { planAction, executePlan, type PlanResponse } from "@/lib/ai/client";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import {
  invalidateCajas,
  invalidateClientes,
  invalidateLoteEventos,
  invalidateLotes,
  invalidatePedidos,
} from "@/lib/invalidations";
import { toast } from "sonner";

const EXAMPLES = [
  "Crea cajas A1, A2, A3 (uso engorda) en zona A",
  "Crea línea genética C57BL/6, especie Raton, origen Criadero X",
  "En la caja A1 nacieron 12 ratones machos hoy",
];

export default function AIAgentBar() {
  const qc = useQueryClient();
  const { workspaceId } = useActiveWorkspace();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [planning, setPlanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const submit = async () => {
    const t = text.trim();
    if (!t || planning) return;
    if (!workspaceId) {
      toast.error("Selecciona un entorno antes de usar el agente IA.");
      return;
    }
    setPlanning(true);
    try {
      const result = await planAction(t, workspaceId);
      if (result.operations.length === 0 && result.invalid.length === 0) {
        toast.error("No se detectaron operaciones en tu instrucción.");
        return;
      }
      setPlan(result);
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error(msg);
    } finally {
      setPlanning(false);
    }
  };

  const cancel = () => {
    setPlan(null);
    setText("");
  };

  const confirm = async (approvedIds: string[]) => {
    if (!plan || approvedIds.length === 0) return;
    setExecuting(true);
    try {
      const res = await executePlan(plan.plan_id, approvedIds);
      const ok = res.results.filter((r) => r.status === "ok").length;
      const err = res.results.length - ok;
      if (err === 0) toast.success(`${ok} operación(es) ejecutada(s).`);
      else if (ok === 0) toast.error(`Todas fallaron (${err}).`);
      else toast.warning(`${ok} ejecutada(s), ${err} con error.`);

      invalidateLotes(qc);
      invalidateLoteEventos(qc);
      invalidateCajas(qc);
      invalidateClientes(qc);
      invalidatePedidos(qc);
      qc.invalidateQueries({ queryKey: ["lineas_geneticas"] });

      setPlan(null);
      setText("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error(msg);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir agente IA"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-4 py-3 shadow-glow hover:opacity-90 transition-opacity"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium hidden sm:inline">Agente IA</span>
        <kbd className="hidden md:inline ml-1 text-[10px] rounded bg-primary-foreground/20 px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={(o) => !planning && setOpen(o)}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="display-font flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Agente IA
            </DialogTitle>
            <DialogDescription>
              Describe lo que quieres hacer. El agente prepara un plan, tú revisas y autorizas qué se ejecuta.
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
                  submit();
                }
              }}
              placeholder='Ej: "Crea cajas B1, B2 en zona B uso engorda y registra 3 muertes en lote L-001"'
              disabled={planning}
              rows={5}
              className="resize-y"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter para enviar</span>
              <Button
                onClick={submit}
                disabled={planning || !text.trim()}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                {planning ? (
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

      <AIPlanPreview
        plan={plan}
        open={!!plan}
        onClose={cancel}
        onConfirm={confirm}
        isExecuting={executing}
      />
    </>
  );
}

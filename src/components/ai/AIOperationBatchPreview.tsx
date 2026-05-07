import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import AIOperationCard from "./AIOperationCard";
import AIValidationWarnings from "./AIValidationWarnings";
import type {
  BatchParseResult,
  OperationExecutionResult,
  ParsedOperation,
} from "@/data/aiCommand";

interface Props {
  batch: BatchParseResult | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (selected: ParsedOperation[]) => Promise<void> | void;
  isExecuting: boolean;
  results: OperationExecutionResult[] | null;
}

export default function AIOperationBatchPreview({
  batch, open, onClose, onConfirm, isExecuting, results,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Default selection: include all ops with confidence >= 0.6.
  useEffect(() => {
    if (!batch) return;
    const next = new Set<string>();
    batch.operations.forEach((op) => {
      if (op.confidence >= 0.6) next.add(op.id);
    });
    setSelected(next);
  }, [batch]);

  const resultsById = useMemo(() => {
    const m = new Map<string, OperationExecutionResult>();
    (results ?? []).forEach((r) => m.set(r.id, r));
    return m;
  }, [results]);

  if (!batch) return null;

  const allIds = batch.operations.map((o) => o.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const selectedOps = batch.operations.filter((o) => selected.has(o.id));
  const executed = !!results;
  const okCount = (results ?? []).filter((r) => r.status === "ok").length;
  const errCount = (results ?? []).length - okCount;

  const toggle = (id: string, v: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) next.add(id); else next.delete(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allIds));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isExecuting && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="display-font flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {executed ? "Resultado del lote" : "Operaciones detectadas"}
          </DialogTitle>
          <DialogDescription>
            {executed
              ? `${okCount} ejecutada(s)${errCount ? `, ${errCount} con error` : ""}. Nada más se ejecutará sin tu aprobación.`
              : `${batch.operations.length} operación(es). Revisa, marca las que quieres ejecutar y confirma.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-3">
          <AIValidationWarnings invalid={batch.invalid} />

          {batch.operations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              No se detectó ninguna operación válida en la nota.
            </div>
          ) : (
            <>
              {!executed && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
                  >
                    {allSelected ? "Deseleccionar todas" : "Seleccionar todas"}
                  </button>
                  <span>{selectedOps.length} de {batch.operations.length} seleccionada(s)</span>
                </div>
              )}
              <ScrollArea className="h-[45vh] pr-3">
                <div className="space-y-2">
                  {batch.operations.map((op) => (
                    <AIOperationCard
                      key={op.id}
                      op={op}
                      selected={selected.has(op.id)}
                      onToggle={toggle}
                      disabled={isExecuting}
                      result={resultsById.get(op.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isExecuting}>
            {executed ? "Cerrar" : "Cancelar"}
          </Button>
          {!executed && (
            <Button
              onClick={() => onConfirm(selectedOps)}
              disabled={isExecuting || selectedOps.length === 0}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              {isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ejecutar {selectedOps.length} operación(es)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import AIOperationBatchPreview from "./AIOperationBatchPreview";
import {
  executeBatch,
  parseBatch,
  type BatchParseResult,
  type OperationExecutionResult,
  type ParsedOperation,
} from "@/data/aiCommand";
import {
  invalidateCajas,
  invalidateLoteEventos,
  invalidateLotes,
} from "@/lib/invalidations";
import { toast } from "sonner";

const EXAMPLES = [
  "Crea línea genética C57BL/6, especie Raton",
  "Añade cajas A1, A2, A3 (uso engorda) en zona A",
  `Hoy añadimos 4 cajas: B1, B2, B3, B4 (libres, zona B).
También en la caja A1 nacieron 12.
Y añadimos línea genética Ratón 1, origen Criadero Conejitos.`,
];

export default function AICommandBar() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [batch, setBatch] = useState<BatchParseResult | null>(null);
  const [results, setResults] = useState<OperationExecutionResult[] | null>(null);
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
    if (!t || parsing) return;
    setParsing(true);
    try {
      const parsed = await parseBatch(t);
      if (parsed.operations.length === 0 && parsed.invalid.length === 0) {
        toast.error("No se detectaron operaciones en la nota.");
        return;
      }
      setBatch(parsed);
      setResults(null);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo interpretar la nota");
    } finally {
      setParsing(false);
    }
  };

  const cancel = () => {
    setBatch(null);
    setResults(null);
    if (results) setText("");
  };

  const confirm = async (selected: ParsedOperation[]) => {
    if (!batch || selected.length === 0) return;
    setExecuting(true);
    try {
      const res = await executeBatch(batch.note, selected);
      setResults(res.results);
      const ok = res.results.filter((r) => r.status === "ok").length;
      const err = res.results.length - ok;
      if (err === 0) toast.success(`${ok} operación(es) ejecutada(s).`);
      else if (ok === 0) toast.error(`Todas fallaron (${err}).`);
      else toast.warning(`${ok} ejecutada(s), ${err} con error.`);
      invalidateLotes(qc);
      invalidateLoteEventos(qc);
      invalidateCajas(qc);
      qc.invalidateQueries({ queryKey: ["lineas_geneticas"] });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo ejecutar el lote");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir copiloto IA"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-4 py-3 shadow-glow hover:opacity-90 transition-opacity"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium hidden sm:inline">Copiloto</span>
        <kbd className="hidden md:inline ml-1 text-[10px] rounded bg-primary-foreground/20 px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={(o) => !parsing && setOpen(o)}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="display-font flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Copiloto operativo
            </DialogTitle>
            <DialogDescription>
              Escribe o pega una nota con varias acciones. La IA propone, tú confirmas cuáles ejecutar.
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
              placeholder={`Ej: "Hoy añadimos cajas B1, B2, B3 en zona B. En A1 nacieron 12. Nueva línea Ratón 1."`}
              disabled={parsing}
              rows={5}
              className="resize-y"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                ⌘/Ctrl + Enter para enviar
              </span>
              <Button
                onClick={submit}
                disabled={parsing || !text.trim()}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                {parsing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Interpretando…</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Analizar</>
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
                  className="text-left text-xs rounded-lg border border-border/60 bg-muted/40 hover:bg-muted px-3 py-2 text-muted-foreground hover:text-foreground transition-colors whitespace-pre-line"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AIOperationBatchPreview
        batch={batch}
        open={!!batch}
        onClose={cancel}
        onConfirm={confirm}
        isExecuting={executing}
        results={results}
      />
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AIConfirmationDialog from "./AIConfirmationDialog";
import { executeCommand, parseCommand, type ParsedIntent } from "@/data/aiCommand";
import {
  invalidateCajas,
  invalidateLoteEventos,
  invalidateLotes,
} from "@/lib/invalidations";
import { toast } from "sonner";

const EXAMPLES = [
  "Crea línea genética C57BL/6",
  "Añade cajas A1, A2, A3 (uso engorda)",
  "Crea lote C57-22 de Raton, nacido 2026-04-01, 10 machos y 8 hembras en A1",
  "En la caja A1 murieron 2 hoy",
  "Mueve 4 hembras del lote C57-22 a la caja B2",
];

export default function AICommandBar() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K shortcut
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
      const parsed = await parseCommand(t);
      setIntent(parsed);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo interpretar el comando");
    } finally {
      setParsing(false);
    }
  };

  const cancel = () => {
    setIntent(null);
  };

  const confirm = async () => {
    if (!intent) return;
    setExecuting(true);
    try {
      const res = await executeCommand({
        intent: intent.intent,
        confidence: intent.confidence,
        payload: intent.payload,
      });
      toast.success(res.summary);
      // Refresh affected caches.
      invalidateLotes(qc);
      invalidateLoteEventos(qc);
      invalidateCajas(qc);
      qc.invalidateQueries({ queryKey: ["lineas_geneticas"] });
      setIntent(null);
      setText("");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo ejecutar la acción");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
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

      {/* Command input */}
      <Dialog open={open} onOpenChange={(o) => !parsing && setOpen(o)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="display-font flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Copiloto operativo
            </DialogTitle>
            <DialogDescription>
              Escribe una acción en lenguaje natural. La IA propone, tú confirmas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder='Ej: "Crea lote C57-22 de Raton con 12 individuos en A1"'
              disabled={parsing}
              className="flex-1"
            />
            <Button
              onClick={submit}
              disabled={parsing || !text.trim()}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ejemplos</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="text-xs rounded-full border border-border/60 bg-muted/40 hover:bg-muted px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AIConfirmationDialog
        intent={intent}
        open={!!intent}
        onClose={cancel}
        onConfirm={confirm}
        isExecuting={executing}
      />
    </>
  );
}

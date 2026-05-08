import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AIOperationBatchPreview from "./AIOperationBatchPreview";
import AISuggestionCard from "./AISuggestionCard";
import { generateOperationalSuggestions } from "@/lib/aiSuggestions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  executeBatch,
  parseBatch,
  sendAITelemetry,
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
  const [openAt, setOpenAt] = useState<number>(0);
  const [manualEdit, setManualEdit] = useState(false);
  const [autoAnalyzeTimer, setAutoAnalyzeTimer] = useState<NodeJS.Timeout | null>(null);
  const [dismissedSuggestIds, setDismissedSuggestIds] = useState<Set<string>>(new Set());

  // Fetch contextual data for suggestions ONLY when Copilot is open to avoid aggressive polling
  const { data: suggestionData } = useQuery({
    queryKey: ["ai_suggestions_context"],
    queryFn: async () => {
      const [cajasRes, lotesRes] = await Promise.all([
        supabase.from("cajas").select("*"),
        supabase.from("lotes").select("*"),
      ]);
      return { cajas: cajasRes.data || [], lotes: lotesRes.data || [] };
    },
    enabled: open,
    staleTime: 60000,
  });

  const suggestions = useMemo(() => {
    if (!suggestionData) return [];
    const all = generateOperationalSuggestions(suggestionData.cajas, suggestionData.lotes);
    // Limit to top 3 that are not dismissed
    return all.filter((s) => !dismissedSuggestIds.has(s.id)).slice(0, 3);
  }, [suggestionData, dismissedSuggestIds]);

  const handlePrepareSuggestion = (prompt: string) => {
    sendAITelemetry("suggestion_accepted");
    setText(prompt);
    setManualEdit(false); // Enable auto-analyze
    // The existing submit() will be triggered by user or autoAnalyze depending on if we just trigger it directly
    // Let's trigger it directly for instant UX
    submitSuggestion(prompt);
  };

  const submitSuggestion = async (t: string) => {
    if (parsing) return;
    setParsing(true);
    try {
      const parsed = await parseBatch(t);
      if (parsed.operations.length === 0 && parsed.invalid.length === 0) {
        toast.error("No se detectaron operaciones en la sugerencia.");
        return;
      }
      setBatch(parsed);
      setResults(null);
      setOpen(false);
      setOpenAt(performance.now());
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo interpretar la sugerencia");
    } finally {
      setParsing(false);
    }
  };

  const handleDismissSuggestion = (id: string) => {
    sendAITelemetry("suggestion_dismissed");
    setDismissedSuggestIds((prev) => new Set(prev).add(id));
  };

  const speech = useSpeechRecognition((finalText) => {
    setText((prev) => prev ? prev + " " + finalText : finalText);
  });

  // Auto-analyze logic
  useEffect(() => {
    if (speech.state === "idle" && speech.transcript && !manualEdit) {
      // Voice just ended, we have transcript, and user hasn't typed
      sendAITelemetry("voice_transcription_success", undefined, { length: speech.transcript.length });
      
      const timer = setTimeout(() => {
        setAutoAnalyzeTimer(null);
        if (open && !parsing) submit();
      }, 1000);
      setAutoAnalyzeTimer(timer);
      
      speech.reset(); // Clear transcript state so we don't re-trigger
    } else if (speech.state === "error") {
      sendAITelemetry("voice_transcription_error", undefined, { error: speech.error });
    }
  }, [speech.state, speech.transcript]);

  // Cancel auto-analyze if manual edit
  useEffect(() => {
    if (manualEdit && autoAnalyzeTimer) {
      clearTimeout(autoAnalyzeTimer);
      setAutoAnalyzeTimer(null);
    }
  }, [manualEdit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) setOpenAt(performance.now());
          else if (text.trim() && !batch && !parsing) sendAITelemetry("abandoned_prompt", performance.now() - openAt, { length: text.length });
          return !o;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [text, batch, parsing, openAt]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (openAt === 0) setOpenAt(performance.now());
    } else {
      if (text.trim() && !batch && !parsing) {
         sendAITelemetry("abandoned_prompt", performance.now() - openAt, { length: text.length });
      }
      setOpenAt(0);
    }
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
      setOpenAt(performance.now()); // Reset timer for confirmation phase
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo interpretar la nota");
    } finally {
      setParsing(false);
    }
  };

  const cancel = () => {
    sendAITelemetry("execution_cancelled", performance.now() - openAt);
    setBatch(null);
    setResults(null);
    if (results) setText("");
  };

  const confirm = async (selected: ParsedOperation[]) => {
    if (!batch || selected.length === 0) return;
    setExecuting(true);
    const duration = performance.now() - openAt;
    try {
      const res = await executeBatch(batch.note, selected);
      sendAITelemetry("execution_confirmed", duration, { selected_count: selected.length, total_count: batch.operations.length });
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
            {!text.trim() && suggestions.length > 0 && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Sugerencias Operativas
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <AISuggestionCard
                      key={s.id}
                      suggestion={s}
                      onPrepare={handlePrepareSuggestion}
                      onDismiss={handleDismissSuggestion}
                    />
                  ))}
                </div>
              </div>
            )}

              <div className="relative">
                <Textarea
                  ref={inputRef}
                  value={speech.state === "listening" || speech.state === "processing" ? (text ? text + " " + speech.interimTranscript : speech.interimTranscript) : text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setManualEdit(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder={`Ej: "Hoy añadimos cajas B1, B2, B3 en zona B. En A1 nacieron 12. Nueva línea Ratón 1."`}
                  disabled={parsing}
                  rows={5}
                  className="resize-y pb-12"
                />
                
                {/* Voice Controls Overlay */}
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                  {(speech.state === "listening" || speech.state === "processing") && (
                    <span className="text-xs text-primary animate-pulse flex items-center gap-1 bg-background/80 px-2 py-1 rounded-md">
                      {speech.state === "processing" ? "Procesando..." : "Escuchando..."}
                    </span>
                  )}
                  {speech.state === "unsupported" ? null : (
                    <Button
                      type="button"
                      variant={speech.state === "listening" ? "destructive" : "secondary"}
                      size="icon"
                      className={`h-8 w-8 rounded-full ${speech.state === "listening" ? "animate-pulse shadow-glow-destructive" : ""}`}
                      onClick={() => {
                        if (speech.state === "listening") {
                          speech.stop();
                        } else {
                          speech.start();
                          sendAITelemetry("voice_interaction_started");
                          setManualEdit(false);
                        }
                      }}
                      disabled={parsing || speech.state === "permission_denied"}
                      title={speech.state === "permission_denied" ? "Permiso denegado" : "Dictar por voz"}
                    >
                      <Mic className={`h-4 w-4 ${speech.state === "listening" ? "text-destructive-foreground" : ""}`} />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {autoAnalyzeTimer ? (
                    <span className="text-primary animate-pulse">Auto-analizando en breve...</span>
                  ) : (
                    "⌘/Ctrl + Enter para enviar"
                  )}
                </span>
                <div className="flex gap-2">
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

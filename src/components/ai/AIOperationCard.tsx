import { AlertTriangle, CheckCircle2, XCircle, Flame, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DESTRUCTIVE_INTENTS,
  INTENT_LABELS,
  isClarification,
  type OperationExecutionResult,
  type ParsedOperation,
} from "@/data/aiCommand";

function renderValue(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.map(renderValue).join(", ");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${renderValue(val)}`)
      .join(" · ");
  }
  return String(v);
}

interface Props {
  op: ParsedOperation;
  selected: boolean;
  onToggle: (id: string, value: boolean) => void;
  result?: OperationExecutionResult;
  disabled?: boolean;
}

export default function AIOperationCard({ op, selected, onToggle, result, disabled }: Props) {
  const clarification = isClarification(op.intent);
  const lowConfidence = !clarification && op.confidence < 0.6;
  const destructive = DESTRUCTIVE_INTENTS.has(op.intent);
  const entries = Object.entries(op.payload);

  // Clarification ops cannot be executed — they need human follow-up first.
  const checkboxDisabled = disabled || !!result || clarification;

  // ── Clarification rendering ──
  if (clarification) {
    const reason = (op.payload as any)?.razon ?? (op.payload as any)?.reason;
    const missing = ((op.payload as any)?.missing_fields ?? []) as string[];
    const ambiguous = ((op.payload as any)?.ambiguous_references ?? []) as string[];
    const suggestions = ((op.payload as any)?.suggestions ?? []) as string[];
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300 gap-1">
            <HelpCircle className="h-3 w-3" />
            {INTENT_LABELS[op.intent] ?? op.intent}
          </Badge>
          <span className="text-[11px] text-muted-foreground">no se ejecutará</span>
        </div>
        {op.source_text && (
          <p className="text-xs italic text-muted-foreground line-clamp-2">"{op.source_text}"</p>
        )}
        {reason && (
          <p className="text-sm text-amber-800 dark:text-amber-200">{reason}</p>
        )}
        {missing.length > 0 && (
          <div className="text-xs">
            <span className="font-semibold text-muted-foreground">Faltan: </span>
            {missing.join(", ")}
          </div>
        )}
        {ambiguous.length > 0 && (
          <div className="text-xs">
            <span className="font-semibold text-muted-foreground">Ambiguo: </span>
            {ambiguous.join(", ")}
          </div>
        )}
        {suggestions.length > 0 && (
          <ul className="text-xs list-disc pl-5 space-y-0.5 text-muted-foreground">
            {suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border bg-card transition-colors ${
        result?.status === "ok"
          ? "border-emerald-500/40"
          : result?.status === "error"
          ? "border-destructive/50"
          : selected
          ? "border-primary/40"
          : "border-border/60"
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        <Checkbox
          checked={selected}
          disabled={checkboxDisabled}
          onCheckedChange={(v) => onToggle(op.id, v === true)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" className="bg-gradient-primary text-primary-foreground">
              {INTENT_LABELS[op.intent] ?? op.intent}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {(op.confidence * 100).toFixed(0)}%
            </Badge>
            {destructive && (
              <Badge variant="outline" className="text-[11px] border-destructive/40 text-destructive gap-1">
                <Flame className="h-3 w-3" /> sensible
              </Badge>
            )}
            {lowConfidence && (
              <Badge variant="outline" className="text-[11px] border-amber-500/40 text-amber-600 gap-1">
                <AlertTriangle className="h-3 w-3" /> baja confianza
              </Badge>
            )}
          </div>

          {op.source_text && (
            <p className="text-xs italic text-muted-foreground line-clamp-2">"{op.source_text}"</p>
          )}

          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              ✓ Lo que voy a hacer
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 divide-y divide-border/40">
              {entries.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">Sin datos.</p>
              ) : (
                entries.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[110px_1fr] gap-3 p-2 text-xs">
                    <span className="font-medium text-muted-foreground uppercase tracking-wide">{k}</span>
                    <span className="text-foreground tabular-nums break-words">{renderValue(v)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {op.explanation && (op.explanation.understood || op.explanation.assumptions_made?.length || op.explanation.entities_resolved?.length) && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                🔍 Lo que entendí
              </div>
              <div className="rounded-lg border border-border/40 bg-background/40 p-2 space-y-1 text-xs">
                {op.explanation.understood && (
                  <p className="text-foreground/80">{op.explanation.understood}</p>
                )}
                {op.explanation.entities_resolved?.length ? (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Entidades:</span> {op.explanation.entities_resolved.join(", ")}
                  </p>
                ) : null}
                {op.explanation.assumptions_made?.length ? (
                  <p className="text-amber-700 dark:text-amber-300">
                    <span className="font-medium">Asumí:</span> {op.explanation.assumptions_made.join("; ")}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {lowConfidence && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-800 dark:text-amber-200">
              <span className="font-semibold">⚠ Información incierta:</span> la confianza es baja, revisa los datos antes de aprobar.
            </div>
          )}

          {result && (
            <div
              className={`flex items-start gap-2 rounded-lg p-2 text-xs ${
                result.status === "ok"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {result.status === "ok" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{result.status === "ok" ? result.summary : result.error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

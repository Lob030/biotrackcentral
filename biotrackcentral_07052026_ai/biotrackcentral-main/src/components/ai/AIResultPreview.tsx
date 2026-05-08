import { Badge } from "@/components/ui/badge";
import { INTENT_LABELS, type ParsedIntent } from "@/data/aiCommand";
import { AlertTriangle } from "lucide-react";

interface Props {
  intent: ParsedIntent;
}

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

export default function AIResultPreview({ intent }: Props) {
  const lowConfidence = intent.confidence < 0.6;
  const entries = Object.entries(intent.payload);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={intent.intent === "requires_clarification" ? "destructive" : "default"} className={intent.intent !== "requires_clarification" ? "bg-gradient-primary text-primary-foreground" : ""}>
          {INTENT_LABELS[intent.intent] ?? intent.intent}
        </Badge>
        <Badge variant="outline" className="text-[11px]">
          confianza {(intent.confidence * 100).toFixed(0)}%
        </Badge>
      </div>

      {intent.explanation && (
        <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-sm space-y-1">
          <p className="font-medium text-primary">🧠 Qué entendió la IA:</p>
          <p className="text-muted-foreground">{intent.explanation.understood}</p>
          {intent.explanation.entities_resolved && intent.explanation.entities_resolved.length > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              <span className="font-medium">Contexto resuelto:</span> {intent.explanation.entities_resolved.join(", ")}
            </p>
          )}
          {intent.explanation.assumptions_made && intent.explanation.assumptions_made.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Asunciones:</span> {intent.explanation.assumptions_made.join(", ")}
            </p>
          )}
        </div>
      )}

      {intent.intent === "requires_clarification" ? (
        <div className="flex flex-col gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-semibold">Se requiere aclaración</span>
          </div>
          <p>{String(intent.payload.razon || "Faltan datos para ejecutar esto.")}</p>
          {intent.payload.suggestions && Array.isArray(intent.payload.suggestions) && intent.payload.suggestions.length > 0 && (
            <div className="mt-2 text-xs">
              <strong>Sugerencias:</strong>
              <ul className="list-disc list-inside mt-1">
                {intent.payload.suggestions.map((s, i) => (
                  <li key={i}>{String(s)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : lowConfidence ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>La IA no está segura de esta interpretación. Revisa los datos antes de confirmar.</span>
        </div>
      ) : null}

      {intent.intent !== "requires_clarification" && (
        <div className="rounded-lg border border-border/60 bg-muted/30 divide-y divide-border/40">
          {entries.length === 0 && (
            <p className="p-3 text-xs text-muted-foreground">Sin datos.</p>
          )}
          {entries.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[120px_1fr] gap-3 p-3 text-sm">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k}</span>
              <span className="text-foreground tabular-nums break-words">{renderValue(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

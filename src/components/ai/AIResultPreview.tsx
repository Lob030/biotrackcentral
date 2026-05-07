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
        <Badge variant="default" className="bg-gradient-primary text-primary-foreground">
          {INTENT_LABELS[intent.intent] ?? intent.intent}
        </Badge>
        <Badge variant="outline" className="text-[11px]">
          confianza {(intent.confidence * 100).toFixed(0)}%
        </Badge>
      </div>

      {lowConfidence && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>La IA no está segura de esta interpretación. Revisa los datos antes de confirmar.</span>
        </div>
      )}

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
    </div>
  );
}

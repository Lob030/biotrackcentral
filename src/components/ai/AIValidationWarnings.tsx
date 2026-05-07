import { AlertTriangle } from "lucide-react";
import type { InvalidOperation } from "@/data/aiCommand";
import { INTENT_LABELS } from "@/data/aiCommand";

export default function AIValidationWarnings({ invalid }: { invalid: InvalidOperation[] }) {
  if (!invalid.length) return null;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm font-medium">
        <AlertTriangle className="h-4 w-4" />
        {invalid.length} operación(es) no se pudieron interpretar
      </div>
      <ul className="space-y-1.5 text-xs">
        {invalid.map((op) => (
          <li key={op.id} className="rounded bg-background/60 border border-amber-500/30 p-2">
            <div className="font-medium text-foreground">
              {op.intent ? (INTENT_LABELS[op.intent] ?? op.intent) : "Operación desconocida"}
            </div>
            <div className="text-muted-foreground">{op.error}</div>
            {op.source_text && (
              <div className="mt-1 italic text-muted-foreground/80 truncate">"{op.source_text}"</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

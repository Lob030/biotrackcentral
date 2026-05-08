import { Flame, AlertTriangle, Info, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AISuggestion } from "@/lib/aiSuggestions";

interface Props {
  suggestion: AISuggestion;
  onPrepare: (syntheticPrompt: string) => void;
  onDismiss: (id: string) => void;
}

export default function AISuggestionCard({ suggestion, onPrepare, onDismiss }: Props) {
  const isHigh = suggestion.severity === "high";
  const isMedium = suggestion.severity === "medium";

  const Icon = isHigh ? Flame : isMedium ? AlertTriangle : Info;
  const colorClass = isHigh
    ? "text-destructive border-destructive/30 bg-destructive/5"
    : isMedium
    ? "text-amber-500 border-amber-500/30 bg-amber-500/5"
    : "text-blue-500 border-blue-500/30 bg-blue-500/5";

  return (
    <div className={`relative flex items-start gap-3 rounded-xl border p-3 ${colorClass} transition-all hover:bg-muted/40`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground">{suggestion.title}</h4>
        <p className="text-xs text-muted-foreground mt-1 mb-2">{suggestion.description}</p>
        
        <Button 
          variant="secondary" 
          size="sm" 
          className="h-7 text-[11px] bg-background border hover:bg-accent"
          onClick={() => onPrepare(suggestion.syntheticPrompt)}
        >
          <Play className="h-3 w-3 mr-1" />
          Preparar
        </Button>
      </div>

      <button
        type="button"
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-background/80"
        onClick={() => onDismiss(suggestion.id)}
        title="Ignorar"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

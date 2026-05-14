import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, Activity } from "lucide-react";

interface WorkspaceCardProps {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function WorkspaceCard({ id, name, type, isActive, onSelect, disabled }: WorkspaceCardProps) {
  return (
    <Card
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onSelect(id)}
      onKeyDown={(e) => !disabled && (e.key === 'Enter' || e.key === ' ') && onSelect(id)}
      className={`relative p-4 transition-all duration-300 border-2 flex items-center justify-between group
        ${disabled 
          ? "opacity-50 cursor-not-allowed grayscale-[0.5]" 
          : "cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] active:scale-[0.98]"
        }
        ${isActive ? "border-primary bg-primary/[0.04] shadow-glow-sm" : "border-border/50"}
      `}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:text-foreground'}`}>
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-semibold text-sm tracking-tight">{name}</h4>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{type}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isActive ? (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-[10px] uppercase font-bold py-0.5">
            <CheckCircle2 className="h-3 w-3" />
            Activo
          </Badge>
        ) : (
          <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${disabled ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
        )}
      </div>

      {/* Decorative Glow for Active State */}
      {isActive && (
        <div className="absolute inset-0 border border-primary/20 rounded-xl pointer-events-none animate-pulse-slow" />
      )}
    </Card>
  );
}

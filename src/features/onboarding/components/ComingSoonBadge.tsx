import React from 'react';
import { Lock } from 'lucide-react';

interface ComingSoonBadgeProps {
  label?: string;
  className?: string;
}

export function ComingSoonBadge({ label = "Próximamente", className = "" }: ComingSoonBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted border border-border text-xs font-medium text-muted-foreground ${className}`}>
      <Lock className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
}

import React from 'react';
import { ComingSoonBadge } from "@/features/onboarding/components/ComingSoonBadge";

interface ContextGroupProps {
  title: string;
  description?: string;
  isEnabled: boolean;
  badge?: string;
  children: React.ReactNode;
}

export function ContextGroup({ title, description, isEnabled, badge, children }: ContextGroupProps) {
  return (
    <div className={`space-y-4 ${!isEnabled ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            {title}
            {!isEnabled && badge && <ComingSoonBadge label={badge} />}
          </h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

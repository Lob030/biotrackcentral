import React from 'react';

interface ReadinessItem {
  id: string;
  label: string;
  entityReference: string;
  actionIntent: string;
}

interface ReadinessWidgetProps {
  title: string;
  items: ReadinessItem[];
  icon: React.ReactNode;
  onActionClick: (command: string) => void;
}

export const ReadinessWidget: React.FC<ReadinessWidgetProps> = ({ title, items, icon, onActionClick }) => {
  if (items.length === 0) {
    return null; // Don't show empty readiness widgets to save space
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-3 bg-muted/30 border-b border-border flex items-center gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <h4 className="font-medium text-sm">{title}</h4>
        <span className="ml-auto bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>
      
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div key={item.id} className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{item.entityReference}</span>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <button
              onClick={() => onActionClick(item.actionIntent)}
              className="text-xs font-medium px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
            >
              Atender
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

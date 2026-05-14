import React from 'react';
import { formatEstimationBand } from '../../operational-settings/runtime/confidence';
import type { EstimationRange, ConfidenceLevel } from '../../operational-settings/runtime/confidence';

interface ForecastWidgetProps {
  title: string;
  metricLabel: string;
  estimation: EstimationRange;
  confidence: ConfidenceLevel;
  daysOut: number;
  trend: 'up' | 'down' | 'stable';
}

export const ForecastWidget: React.FC<ForecastWidgetProps> = ({
  title,
  metricLabel,
  estimation,
  confidence,
  daysOut,
  trend
}) => {
  const getConfidenceColor = (level: ConfidenceLevel) => {
    switch (level) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-orange-500';
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground">
          +{daysOut} días
        </span>
      </div>
      
      <div className="mt-2">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-foreground tracking-tight">
            {formatEstimationBand(estimation, true).replace(estimation.unit, '').trim()}
          </span>
          <span className="text-sm text-muted-foreground mb-1 font-medium uppercase">
            {estimation.unit}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{metricLabel}</p>
      </div>
      
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${getConfidenceColor(confidence)}`} />
          <span className="text-xs text-muted-foreground capitalize">
            Confianza {confidence}
          </span>
        </div>
        
        {trend === 'down' && (
          <span className="flex items-center text-destructive text-xs font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
            En declive
          </span>
        )}
        {trend === 'up' && (
          <span className="flex items-center text-green-500 text-xs font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            En aumento
          </span>
        )}
      </div>
    </div>
  );
};

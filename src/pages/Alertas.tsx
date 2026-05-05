import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { generarAlertas, type AlertaSeveridad } from "@/lib/alertas";
import { AlertTriangle, AlertCircle, Info, BellRing, ArrowRight, CheckCircle2, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AdministrarAlertasModal from "@/components/AdministrarAlertasModal";

const severityConfig: Record<AlertaSeveridad, { icon: any; cls: string; label: string; iconCls: string }> = {
  critical: {
    icon: AlertCircle,
    cls: "border-destructive/40 bg-destructive/5",
    iconCls: "bg-destructive/15 text-destructive",
    label: "Crítico",
  },
  warning: {
    icon: AlertTriangle,
    cls: "border-warning/40 bg-warning/5",
    iconCls: "bg-warning/15 text-warning",
    label: "Atención",
  },
  info: {
    icon: Info,
    cls: "border-primary/30 bg-primary/5",
    iconCls: "bg-primary/15 text-primary",
    label: "Info",
  },
};

export default function Alertas() {
  const { data: lotes = [] } = useQuery({
    queryKey: ["lotes-alertas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lotes").select("*").eq("estado", "activo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cajas = [] } = useQuery({
    queryKey: ["cajas-alertas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cajas").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const alertas = generarAlertas(lotes, cajas);
  const criticas = alertas.filter((a) => a.severidad === "critical").length;
  const warnings = alertas.filter((a) => a.severidad === "warning").length;
  const infos = alertas.filter((a) => a.severidad === "info").length;

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="display-font text-4xl font-bold tracking-tight flex items-center gap-3">
            <BellRing className="h-8 w-8 text-primary" />
            Alertas
          </h1>
          <p className="text-muted-foreground mt-1">Revisión automática de lotes y cajas que requieren acción</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Críticas</p>
          <p className="display-font text-4xl font-bold mt-1 text-destructive">{criticas}</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Atención</p>
          <p className="display-font text-4xl font-bold mt-1 text-warning">{warnings}</p>
        </div>
        <div className="stat-card">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Informativas</p>
          <p className="display-font text-4xl font-bold mt-1 text-primary">{infos}</p>
        </div>
      </div>

      {alertas.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
          <h2 className="display-font text-xl font-semibold">Todo en orden</h2>
          <p className="text-muted-foreground text-sm mt-1">No hay alertas pendientes en este momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((a) => {
            const cfg = severityConfig[a.severidad];
            const Icon = cfg.icon;
            return (
              <div key={a.id} className={`glass-card p-4 border ${cfg.cls} flex items-start gap-4`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.iconCls}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold">{a.titulo}</h3>
                    <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.descripcion}</p>
                </div>
                {a.accion && (
                  <Link
                    to={a.accion.href}
                    className="shrink-0 text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {a.accion.label} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

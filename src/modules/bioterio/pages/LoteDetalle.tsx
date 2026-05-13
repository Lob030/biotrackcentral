import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Skull,
  DollarSign,
  ArrowRightLeft,
  SlidersHorizontal,
  StickyNote,
  Calendar,
  Layers,
} from "lucide-react";
import { etapaActual, diasDesde, type Especie } from "@/modules/bioterio/lib/etapas";
import EventoDialog, { type EventoTipo } from "@/modules/bioterio/components/EventoDialog";

const TIPO_META: Record<
  string,
  { icon: any; label: string; color: string; ringColor: string }
> = {
  mortalidad: {
    icon: Skull,
    label: "Mortalidad",
    color: "text-destructive",
    ringColor: "ring-destructive/30 bg-destructive/10",
  },
  venta: {
    icon: DollarSign,
    label: "Venta",
    color: "text-success",
    ringColor: "ring-success/30 bg-success/10",
  },
  traslado_caja: {
    icon: ArrowRightLeft,
    label: "Traslado de caja",
    color: "text-primary",
    ringColor: "ring-primary/30 bg-primary/10",
  },
  ajuste: {
    icon: SlidersHorizontal,
    label: "Ajuste",
    color: "text-warning",
    ringColor: "ring-warning/30 bg-warning/10",
  },
  separacion_sexo: {
    icon: Layers,
    label: "Separación por sexo",
    color: "text-accent",
    ringColor: "ring-accent/30 bg-accent/10",
  },
  nota: {
    icon: StickyNote,
    label: "Nota",
    color: "text-muted-foreground",
    ringColor: "ring-border bg-muted",
  },
};

export default function LoteDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evento, setEvento] = useState<EventoTipo | null>(null);

  const { data: lote, isLoading } = useQuery({
    queryKey: ["lote-detalle", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes")
        .select("*, lineas_geneticas(nombre, color_etiqueta), cajas(codigo)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: eventos = [] } = useQuery({
    queryKey: ["lote-eventos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lote_eventos")
        .select("*, cajas:caja_destino_id(codigo)")
        .eq("lote_id", id!)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  const resumen = useMemo(() => {
    const r = { mortalidad: 0, venta: 0, traslados: 0, monto: 0 };
    for (const e of eventos as any[]) {
      if (e.tipo === "mortalidad") r.mortalidad += e.cantidad || 0;
      if (e.tipo === "venta") {
        r.venta += e.cantidad || 0;
        r.monto += (e.precio_unitario || 0) * (e.cantidad || 0);
      }
      if (e.tipo === "traslado_caja") r.traslados += 1;
    }
    return r;
  }, [eventos]);

  if (isLoading)
    return <div className="p-8 text-muted-foreground">Cargando…</div>;
  if (!lote)
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Lote no encontrado.</p>
        <Link to="/lotes" className="text-primary hover:underline text-sm">
          Volver a lotes
        </Link>
      </div>
    );

  const dias = diasDesde(lote.fecha_nacimiento);
  const etapa = etapaActual(lote.especie as Especie, lote.fecha_nacimiento);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="display-font text-4xl font-bold tracking-tight">
              {lote.codigo || lote.id.slice(0, 8)}
            </h1>
            <Badge variant="outline" className="capitalize">
              {lote.tipo}
            </Badge>
            <Badge variant="outline">{lote.especie}</Badge>
            <Badge
              variant={lote.estado === "activo" ? "default" : "secondary"}
              className="capitalize"
            >
              {lote.estado}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            Nacido el {new Date(lote.fecha_nacimiento).toLocaleDateString()} · {dias} días · etapa{" "}
            <strong className="text-foreground">{etapa}</strong>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setEvento("mortalidad")}>
            <Skull className="h-3.5 w-3.5 mr-1 text-destructive" /> Mortalidad
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEvento("venta")}>
            <DollarSign className="h-3.5 w-3.5 mr-1 text-success" /> Venta
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEvento("traslado_caja")}>
            <ArrowRightLeft className="h-3.5 w-3.5 mr-1 text-primary" /> Trasladar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEvento("ajuste")}>
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1 text-warning" /> Ajuste
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEvento("nota")}>
            <StickyNote className="h-3.5 w-3.5 mr-1" /> Nota
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatBox label="Stock actual" value={lote.cantidad_actual ?? 0} highlight />
        <StatBox label="Stock inicial" value={lote.cantidad_inicial ?? 0} />
        <StatBox label="Bajas" value={resumen.mortalidad} color="text-destructive" />
        <StatBox label="Vendidos" value={resumen.venta} color="text-success" />
        <StatBox
          label="Monto vendido"
          value={`$${resumen.monto.toFixed(2)}`}
          color="text-success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detalles */}
        <div className="glass-card p-5 space-y-3">
          <h2 className="display-font text-lg font-semibold mb-2">Detalles</h2>
          <Detalle label="Línea genética" value={lote.lineas_geneticas?.nombre ?? "—"} />
          <Detalle label="Caja actual" value={lote.cajas?.codigo ?? "—"} />
          <Detalle label="Machos" value={lote.machos ?? 0} />
          <Detalle label="Hembras" value={lote.hembras ?? 0} />
          <Detalle label="Sexo" value={lote.sexo ?? "—"} />
          {lote.lote_padre_id && (
            <Detalle
              label="Sub-lote de"
              value={
                <Link
                  to={`/lotes/${lote.lote_padre_id}`}
                  className="text-primary hover:underline"
                >
                  Ver lote padre
                </Link>
              }
            />
          )}
          {lote.notas && (
            <div className="pt-3 border-t border-border/60">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Notas
              </p>
              <p className="text-sm whitespace-pre-wrap">{lote.notas}</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="display-font text-lg font-semibold mb-4">
            Historial · {eventos.length} {eventos.length === 1 ? "evento" : "eventos"}
          </h2>
          {eventos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sin eventos registrados. Usa los botones de arriba para añadir el primero.
            </p>
          ) : (
            <ol className="relative border-l border-border/60 ml-3 space-y-5">
              {(eventos as any[]).map((e) => {
                const meta = TIPO_META[e.tipo] ?? TIPO_META.nota;
                const Icon = meta.icon;
                return (
                  <li key={e.id} className="ml-6">
                    <span
                      className={`absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full ring-2 ${meta.ringColor}`}
                    >
                      <Icon className={`h-3 w-3 ${meta.color}`} />
                    </span>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{meta.label}</span>
                          {e.cantidad > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {e.cantidad} ind.
                            </Badge>
                          )}
                          {e.precio_unitario && (
                            <Badge variant="outline" className="text-[10px] text-success">
                              ${e.precio_unitario} c/u
                            </Badge>
                          )}
                          {e.cajas?.codigo && (
                            <Badge variant="outline" className="text-[10px]">
                              → {e.cajas.codigo}
                            </Badge>
                          )}
                        </div>
                        {e.notas && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                            {e.notas}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {new Date(e.fecha).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <EventoDialog
        lote={lote as any}
        tipo={evento ?? "nota"}
        open={!!evento}
        onClose={() => setEvento(null)}
      />
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: any;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div className={`glass-card p-4 ${highlight ? "border-primary/40" : ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`display-font text-2xl font-bold mt-1 ${
          color ?? (highlight ? "text-primary" : "text-foreground")
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Detalle({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground capitalize">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

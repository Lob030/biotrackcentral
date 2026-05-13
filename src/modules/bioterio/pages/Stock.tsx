import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ETAPAS, etapaActual, rangoDias, rangoPeso, type Especie } from "@/modules/bioterio/lib/etapas";
import { Boxes, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProyeccionDisponibilidad from "@/components/ProyeccionDisponibilidad";
import { useLotesStock, lotesStockKey } from "@/modules/bioterio/data/lotes";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

const ESPECIES: Especie[] = ["ASF", "Raton", "Rata"];

const ESPECIE_LABEL: Record<Especie, string> = {
  ASF: "ASF",
  Raton: "Ratón",
  Rata: "Rata",
};

export default function Stock() {
  const queryClient = useQueryClient();
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());

  const { data: lotes = [], isFetching, isLoading, error, refetch } = useLotesStock();

  const stockPorEspecie = useMemo(() => {
    const result: Record<Especie, { etapa: string; total: number; lotes: number }[]> = {
      ASF: [],
      Raton: [],
      Rata: [],
    };
    for (const especie of ESPECIES) {
      const etapas = ETAPAS[especie];
      const lotesEsp = lotes.filter((l: any) => l.especie === especie);
      result[especie] = etapas.map((e) => {
        const lotesEnEtapa = lotesEsp.filter(
          (l: any) => etapaActual(especie, l.fecha_nacimiento) === e.nombre,
        );
        return {
          etapa: e.nombre,
          total: lotesEnEtapa.reduce((s, l: any) => s + (l.cantidad_actual || 0), 0),
          lotes: lotesEnEtapa.length,
        };
      });
    }
    return result;
  }, [lotes]);

  const totalGlobal = lotes.reduce((s: number, l: any) => s + (l.cantidad_actual || 0), 0);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: lotesStockKey });
    setUpdatedAt(new Date());
  };

  const horaUpdated = updatedAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="display-font text-4xl font-bold tracking-tight flex items-center gap-3">
            <Boxes className="h-8 w-8 text-primary" />
            Stock de individuos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Calculado automáticamente · {totalGlobal} individuos en inventario · Actualizado {horaUpdated}
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Banner explicativo */}
      <div className="glass-card border-primary/30 p-4 mb-6 flex gap-3 items-start">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-primary font-medium">Stock calculado en tiempo real</span> basado en
          lotes activos de tipo <span className="text-foreground font-medium">Nacimiento</span> y{" "}
          <span className="text-foreground font-medium">Engorda</span>. La etapa/tamaño se asigna
          automáticamente según la edad de cada lote desde su{" "}
          <span className="text-foreground font-medium">fecha de nacimiento</span>.
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorState error={error} onRetry={() => refetch()} />
        </div>
      )}

      {/* Tarjetas por especie */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {ESPECIES.map((esp) => (
            <div key={esp} className="glass-card p-5 space-y-3 animate-pulse">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-32" />
              <div className="space-y-2 mt-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity ${isFetching ? "opacity-80" : ""}`}>
        {ESPECIES.map((especie) => {
          const etapas = ETAPAS[especie];
          const filas = stockPorEspecie[especie];
          const totalEsp = filas.reduce((s, f) => s + f.total, 0);
          const totalLotes = filas.reduce((s, f) => s + f.lotes, 0);

          return (
            <section key={especie} className="glass-card p-5 flex flex-col">
              {/* Header tarjeta */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/40">
                <div>
                  <h2 className="display-font text-xl font-bold">{ESPECIE_LABEL[especie]}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalEsp} individuos en total
                  </p>
                </div>
                {totalLotes > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {totalLotes} {totalLotes === 1 ? "lote" : "lotes"}
                  </span>
                )}
              </div>

              {totalEsp === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Sin lotes activos de nacimiento o engorda para {ESPECIE_LABEL[especie]}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Encabezado tabla */}
                  <div className="grid grid-cols-[1.4fr_0.9fr_0.9fr_0.7fr] gap-2 px-2 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    <span>Etapa</span>
                    <span>Días</span>
                    <span>Peso (g)</span>
                    <span className="text-right">Stock</span>
                  </div>

                  {/* Filas */}
                  {etapas.map((e) => {
                    const fila = filas.find((f) => f.etapa === e.nombre);
                    const total = fila?.total ?? 0;
                    const lotesCount = fila?.lotes ?? 0;
                    const pct = totalEsp ? Math.round((total / totalEsp) * 100) : 0;
                    const empty = total === 0;

                    return (
                      <div
                        key={e.nombre}
                        className={`grid grid-cols-[1.4fr_0.9fr_0.9fr_0.7fr] gap-2 items-center rounded-lg px-2 py-2 transition-colors ${
                          empty ? "" : "bg-primary/5"
                        }`}
                      >
                        {/* Etapa con punto + sub-etiqueta */}
                        <div className="flex items-start gap-2 min-w-0">
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                              empty ? "bg-muted-foreground/40" : "bg-primary"
                            }`}
                          />
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium leading-tight ${
                                empty ? "text-muted-foreground" : "text-foreground"
                              }`}
                            >
                              {e.nombre}
                            </p>
                            {e.etiqueta && (
                              <p className="text-[10px] text-primary/80 font-medium leading-tight">
                                {e.etiqueta}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Días */}
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {rangoDias(e)}
                        </span>

                        {/* Peso */}
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {rangoPeso(e)}
                        </span>

                        {/* Stock badge / guion */}
                        <div className="flex justify-end">
                          {empty ? (
                            <span className="text-muted-foreground/60">—</span>
                          ) : (
                            <div
                              className="inline-flex flex-col items-center justify-center min-w-[42px] px-2 py-1 rounded-lg bg-primary/10 border border-primary/30"
                              title={`${lotesCount} ${lotesCount === 1 ? "lote" : "lotes"} · ${pct}%`}
                            >
                              <span className="display-font text-base font-bold text-primary leading-none">
                                {total}
                              </span>
                              <span className="text-[9px] text-primary/70 mt-0.5 leading-none">
                                {lotesCount}L · {pct}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
      )}

      {/* Proyección de disponibilidad por tamaño */}
      <ProyeccionDisponibilidad />
    </div>
  );
}

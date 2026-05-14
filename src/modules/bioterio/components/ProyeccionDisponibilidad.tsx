import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarDays, RefreshCw, Zap } from "lucide-react";
import { useLotesProyeccion, lotesProyeccionKey, type LoteProyeccionRow } from "@/modules/bioterio/data/lotes";

function diasDesde(fecha: string | Date): number {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

type LoteRow = LoteProyeccionRow;


type FilaProy = {
  etapa: string;
  stock: number;
  proximoLote: LoteRow | null;
  otrosLotes: LoteRow[];
  diasFaltantes: number | null; // null => sin lote próximo, <=0 => ya disponible
};

type Estado = "disponible" | "muy_pronto" | "pronto" | "lejano" | "muy_lejano" | "sin_lote";

function clasificar(stock: number, dias: number | null): Estado {
  if (stock > 0) return "disponible";
  if (dias === null) return "sin_lote";
  if (dias <= 0) return "disponible";
  if (dias <= 7) return "muy_pronto";
  if (dias <= 15) return "pronto";
  if (dias <= 30) return "lejano";
  return "muy_lejano";
}

function badgeFor(estado: Estado, dias: number | null, stock: number) {
  switch (estado) {
    case "disponible":
      return {
        cls: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
        text: stock > 0 ? "✅ YA DISPONIBLE" : "✅ YA DISPONIBLE (verificar conteo)",
      };
    case "muy_pronto":
      return { cls: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300", text: `🟡 en ${dias} ${dias === 1 ? "día" : "días"}` };
    case "pronto":
      return { cls: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300", text: `🟠 en ${dias} días` };
    case "lejano":
      return { cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300", text: `🔴 en ${dias} días` };
    case "muy_lejano":
      return { cls: "bg-red-200 text-red-800 dark:bg-red-500/25 dark:text-red-200", text: `🔴 en ${dias} días (retraso grave)` };
    case "sin_lote":
      return { cls: "bg-gray-100 text-gray-500 dark:bg-muted/40 dark:text-muted-foreground", text: "⚫ Sin lote próximo" };
  }
}

export default function ProyeccionDisponibilidad({ profiles, sizeClasses }: { profiles: any[], sizeClasses: any[] }) {
  const qc = useQueryClient();
  const primerProfile = profiles.length > 0 ? profiles[0].id : "";
  const [tab, setTab] = useState<string>(primerProfile);

  const { data: lotes = [], isFetching, dataUpdatedAt } = useLotesProyeccion({
    refetchInterval: 5 * 60 * 1000,
  });


  const proyPorEspecie = useMemo(() => {
    const result: Record<string, FilaProy[]> = {};
    for (const p of profiles) {
      // Resolve legacy species names just in case
      const lotesEsp = lotes.filter((l) => {
        let resolvedSpeciesId = l.especie?.toLowerCase();
        if (resolvedSpeciesId === 'raton' || resolvedSpeciesId === 'ratón') resolvedSpeciesId = 'mouse';
        if (resolvedSpeciesId === 'rata') resolvedSpeciesId = 'rat';
        return (resolvedSpeciesId === p.species_id || l.species_id === p.species_id) && l.fecha_nacimiento;
      });
      
      const clases = sizeClasses.filter((c: any) => c.species_profile_id === p.id);

      result[p.id] = clases.map((e) => {
        const minDays = e.min_age_days ?? 0;
        const maxDays = e.max_age_days ?? 9999;

        // Stock: lotes cuya etapa actual es esta etapa y con cantidad > 0
        const lotesEnEtapa = lotesEsp.filter((l) => {
          const dias = diasDesde(l.fecha_nacimiento!);
          return dias >= minDays && dias <= maxDays && (l.cantidad_actual ?? 0) > 0;
        });
        const stock = lotesEnEtapa.reduce((s, l) => s + (l.cantidad_actual ?? 0), 0);

        // Próximo lote: aún no llega a esta etapa (dias < minDays), tomar el más avanzado
        const candidatos = lotesEsp
          .filter((l) => (l.cantidad_actual ?? 0) > 0)
          .map((l) => ({ lote: l, diasActuales: diasDesde(l.fecha_nacimiento!) }))
          .filter(({ diasActuales }) => diasActuales < minDays)
          .sort((a, b) => b.diasActuales - a.diasActuales);

        const proximo = candidatos[0] ?? null;
        const otros = candidatos.slice(1).map((c) => c.lote);

        let diasFaltantes: number | null = null;
        if (proximo) {
          diasFaltantes = minDays - diasDesde(proximo.lote.fecha_nacimiento!);
        }

        return {
          etapa: e.name,
          stock,
          proximoLote: proximo?.lote ?? null,
          otrosLotes: otros,
          diasFaltantes,
        };
      });
    }
    return result;
  }, [lotes, profiles, sizeClasses]);

  const resumen = useMemo(() => {
    let sinLoteCercano = 0; // sin lote próximo o lejano (>7d) y sin stock
    let reponen8a15 = 0;
    let disponibles = 0;
    for (const p of profiles) {
      for (const fila of (proyPorEspecie[p.id] || [])) {
        const estado = clasificar(fila.stock, fila.diasFaltantes);
        if (estado === "disponible") disponibles++;
        else if (estado === "pronto") reponen8a15++;
        else if (estado === "lejano" || estado === "muy_lejano" || estado === "sin_lote") sinLoteCercano++;
      }
    }
    return { sinLoteCercano, reponen8a15, disponibles };
  }, [proyPorEspecie]);

  const mostrarResumen = resumen.sinLoteCercano > 0 || resumen.reponen8a15 > 0;
  const horaUpdated = new Date(dataUpdatedAt || Date.now()).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
  });

  const handleRefresh = () => qc.invalidateQueries({ queryKey: lotesProyeccionKey });

  return (
    <section className="mt-10">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="display-font text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Proyección de disponibilidad por tamaño
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Actualizado {horaUpdated} · refresco automático cada 5 min
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Actualizar proyección
        </Button>
      </div>

      {mostrarResumen && (
        <div className="glass-card border-warning/30 p-4 mb-5 flex gap-3 items-start">
          <Zap className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-foreground">Resumen de alerta de stock</p>
            <ul className="text-muted-foreground space-y-0.5 list-disc pl-4">
              {resumen.sinLoteCercano > 0 && (
                <li>{resumen.sinLoteCercano} tamaños sin stock y sin reposición cercana (&gt;15 días o sin lote)</li>
              )}
              {resumen.reponen8a15 > 0 && (
                <li>{resumen.reponen8a15} tamaños se reponen en 8–15 días</li>
              )}
              <li>{resumen.disponibles} tamaños disponibles actualmente</li>
            </ul>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v)}>
        <TabsList>
          {profiles.map((p) => (
            <TabsTrigger key={p.id} value={p.id}>{p.operational_name || p.species_name}</TabsTrigger>
          ))}
        </TabsList>

        {profiles.map((p) => (
          <TabsContent key={p.id} value={p.id} className="mt-4">
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase border-b border-border/40">
                      <th className="text-left px-4 py-3">Etapa / Tamaño</th>
                      <th className="text-right px-4 py-3">En stock</th>
                      <th className="text-left px-4 py-3">Próximo lote</th>
                      <th className="text-left px-4 py-3">Disponible en</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(proyPorEspecie[p.id] || []).map((fila) => {
                      const estado = clasificar(fila.stock, fila.diasFaltantes);
                      const badge = badgeFor(estado, fila.diasFaltantes, fila.stock);
                      const lote = fila.proximoLote;
                      const otrosCount = fila.otrosLotes.length;
                      return (
                        <tr key={fila.etapa} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{fila.etapa}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {fila.stock > 0 ? (
                              <span className="font-semibold text-foreground">{fila.stock} unid</span>
                            ) : (
                              <span className="text-muted-foreground">0 unid</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {lote ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link
                                      to={`/lotes/${lote.id}`}
                                      className="text-primary hover:underline text-xs font-mono"
                                    >
                                      {lote.codigo ?? lote.id.slice(0, 8)}
                                      {otrosCount > 0 && (
                                        <span className="text-muted-foreground ml-1">(+{otrosCount} más)</span>
                                      )}
                                    </Link>
                                  </TooltipTrigger>
                                  {otrosCount > 0 && (
                                    <TooltipContent>
                                      <p className="text-xs font-semibold mb-1">Otros lotes próximos:</p>
                                      <ul className="text-xs space-y-0.5">
                                        {fila.otrosLotes.map((l) => (
                                          <li key={l.id} className="font-mono">
                                            {l.codigo ?? l.id.slice(0, 8)}
                                          </li>
                                        ))}
                                      </ul>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${badge.cls}`}>
                              {badge.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

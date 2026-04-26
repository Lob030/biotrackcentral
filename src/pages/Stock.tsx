import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ETAPAS, etapaActual, type Especie } from "@/lib/etapas";
import { Boxes, Package } from "lucide-react";

const ESPECIES: Especie[] = ["ASF", "Raton", "Rata"];

export default function Stock() {
  const { data: lotes = [] } = useQuery({
    queryKey: ["lotes-stock"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lotes").select("*").eq("estado", "activo");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Stock por especie x etapa
  const stockPorEspecie: Record<Especie, { etapa: string; total: number; lotes: number }[]> = {
    ASF: [],
    Raton: [],
    Rata: [],
  };

  for (const especie of ESPECIES) {
    const etapas = ETAPAS[especie];
    const lotesEsp = lotes.filter((l: any) => l.especie === especie);
    stockPorEspecie[especie] = etapas.map((e) => {
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

  const totalGlobal = lotes.reduce((s: number, l: any) => s + (l.cantidad_actual || 0), 0);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="display-font text-4xl font-bold tracking-tight flex items-center gap-3">
            <Boxes className="h-8 w-8 text-primary" />
            Stock por tamaño
          </h1>
          <p className="text-muted-foreground mt-1">
            Inventario de individuos vivos agrupado por etapa de crecimiento · {totalGlobal} totales
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {ESPECIES.map((especie) => {
          const filas = stockPorEspecie[especie];
          const totalEsp = filas.reduce((s, f) => s + f.total, 0);
          return (
            <section key={especie} className="glass-card p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="display-font text-xl font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {especie}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {totalEsp} ind. · {filas.reduce((s, f) => s + f.lotes, 0)} lotes
                </span>
              </div>

              {totalEsp === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sin individuos activos en esta especie.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {filas.map((f) => {
                    const pct = totalEsp ? Math.round((f.total / totalEsp) * 100) : 0;
                    const empty = f.total === 0;
                    return (
                      <div
                        key={f.etapa}
                        className={`rounded-xl border p-4 transition-colors ${
                          empty
                            ? "border-border/40 bg-secondary/20 opacity-60"
                            : "border-primary/20 bg-primary/5 hover:bg-primary/10"
                        }`}
                      >
                        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                          {f.etapa}
                        </p>
                        <p className="display-font text-3xl font-bold mt-1 text-foreground">{f.total}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {f.lotes} {f.lotes === 1 ? "lote" : "lotes"} · {pct}%
                        </p>
                        <div className="h-1 rounded-full bg-secondary overflow-hidden mt-2">
                          <div
                            className="h-full bg-gradient-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
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
    </div>
  );
}

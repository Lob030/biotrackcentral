import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Activity, Layers, Package, FlaskConical, GitBranch, Calendar, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { etapaActual, diasDesde, type Especie } from "@/lib/etapas";
import { Badge } from "@/components/ui/badge";
import { useLotesList } from "@/data/lotes";
import { useCajasList } from "@/data/cajas";
import { StatGridSkeleton, ListSkeleton } from "@/components/ui/list-skeleton";
import { ErrorState } from "@/components/ui/error-state";

function StatCard({ icon: Icon, label, value, sublabel, iconClass }: any) {
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
      </div>
      <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className="display-font text-4xl font-bold mt-1 mb-2 text-foreground">{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground leading-snug">{sublabel}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();

  const lotesQuery = useLotesList({ estado: "activo" });
  const cajasQuery = useCajasList();

  const lotes = lotesQuery.data ?? [];
  const cajas = cajasQuery.data ?? [];

  const isLoading = lotesQuery.isLoading || cajasQuery.isLoading;
  const error = lotesQuery.error ?? cajasQuery.error;

  // Derived stats — memoize to avoid recomputing on every render.
  const stats = useMemo(() => {
    const totalIndividuos = lotes.reduce(
      (s, l: any) => s + (l.cantidad_actual || 0),
      0,
    );
    const lotesNacimiento = lotes.filter((l: any) => l.tipo === "nacimiento").length;
    const lotesEngorda = lotes.filter((l: any) => l.tipo === "engorda").length;
    const lotesReprod = lotes.filter((l: any) => l.tipo === "reproduccion").length;
    const cajasOcupadas = cajas.filter((c: any) => c.estado === "ocupada").length;
    const cajasLibres = cajas.filter((c: any) => c.estado === "libre").length;
    const subLotes = lotes.filter((l: any) => l.lote_padre_id).length;

    const porEspecie = (["ASF", "Raton", "Rata"] as const).map((esp) => {
      const count = lotes
        .filter((l: any) => l.especie === esp)
        .reduce((s: number, l: any) => s + (l.cantidad_actual || 0), 0);
      return {
        especie: esp,
        count,
        pct: totalIndividuos ? Math.round((count / totalIndividuos) * 100) : 0,
      };
    });

    return {
      totalIndividuos,
      lotesNacimiento,
      lotesEngorda,
      lotesReprod,
      cajasOcupadas,
      cajasLibres,
      subLotes,
      porEspecie,
    };
  }, [lotes, cajas]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("es-MX", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [],
  );

  const recientes = useMemo(() => lotes.slice(0, 6), [lotes]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen operativo del bioterio · {profile?.nombre}</p>
        </div>
        <div className="glass-card px-3.5 py-2 flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span className="capitalize">{today}</span>
        </div>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorState
            error={error}
            onRetry={() => {
              lotesQuery.refetch();
              cajasQuery.refetch();
            }}
          />
        </div>
      )}

      {isLoading ? (
        <>
          <div className="mb-6"><StatGridSkeleton /></div>
          <div className="mb-8"><StatGridSkeleton /></div>
          <ListSkeleton rows={4} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Activity} label="Individuos vivos" value={stats.totalIndividuos} sublabel="en todos los lotes activos" iconClass="bg-primary/10 text-primary" />
            <StatCard icon={Layers} label="Lotes nacimiento" value={stats.lotesNacimiento} sublabel="en crecimiento" iconClass="bg-accent/10 text-accent" />
            <StatCard icon={Package} label="Lotes engorda" value={stats.lotesEngorda} sublabel="listos para venta potencial" iconClass="bg-success/10 text-success" />
            <StatCard icon={FlaskConical} label="Reproductores" value={stats.lotesReprod} sublabel="lotes activos" iconClass="bg-warning/10 text-warning" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Package} label="Cajas ocupadas" value={`${stats.cajasOcupadas}/${cajas.length}`} sublabel={`${stats.cajasLibres} libres`} iconClass="bg-primary/10 text-primary" />
            <StatCard icon={GitBranch} label="Total lotes activos" value={lotes.length} sublabel="nacimiento + engorda + reprod." iconClass="bg-accent/10 text-accent" />
            <StatCard icon={Activity} label="Cajas totales" value={cajas.length} sublabel="en el bioterio" iconClass="bg-success/10 text-success" />
            <StatCard icon={Layers} label="Sub-lotes" value={stats.subLotes} sublabel="originados de divisiones" iconClass="bg-warning/10 text-warning" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="display-font text-lg font-semibold">Lotes activos recientes</h2>
                <Link to="/lotes" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              {lotes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No hay lotes activos. <Link to="/lotes" className="text-primary hover:underline">Crear el primero</Link></p>
              ) : (
                <div className="divide-y divide-border/60">
                  {recientes.map((l: any) => {
                    const dias = diasDesde(l.fecha_nacimiento);
                    const etapa = etapaActual(l.especie as Especie, l.fecha_nacimiento);
                    return (
                      <div key={l.id} className="py-3 flex items-center justify-between gap-4 -mx-2 px-2 rounded-md transition-colors hover:bg-muted/30">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{l.codigo || l.id.slice(0, 8)}</span>
                            <Badge variant="outline" className="capitalize text-[10px]">{l.tipo}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {l.especie} · {l.lineas_geneticas?.nombre ?? "Sin línea"} · Caja: {l.cajas?.codigo ?? "—"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium">{etapa}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">{dias} días · {l.cantidad_actual} ind.</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass-card p-5">
              <h2 className="display-font text-lg font-semibold mb-4">Individuos por especie</h2>
              <div className="space-y-4">
                {stats.porEspecie.map((e) => (
                  <div key={e.especie}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{e.especie}</span>
                      <span className="text-xs text-muted-foreground">{e.count} ind · {e.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${e.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

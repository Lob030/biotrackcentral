import { useAuth } from "@/hooks/useAuth";
import { Activity, Layers, Package, FlaskConical, GitBranch, Calendar, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { etapaActual, diasDesde, type Especie } from "@/lib/etapas";
import { Badge } from "@/components/ui/badge";
import { useLotesList } from "@/data/lotes";
import { useCajasList } from "@/data/cajas";

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

  const { data: lotes = [] } = useLotesList({ estado: "activo" });

  const { data: cajas = [] } = useCajasList();

  const totalIndividuos = lotes.reduce((s, l: any) => s + (l.cantidad_actual || 0), 0);
  const lotesNacimiento = lotes.filter((l: any) => l.tipo === "nacimiento").length;
  const lotesEngorda = lotes.filter((l: any) => l.tipo === "engorda").length;
  const lotesReprod = lotes.filter((l: any) => l.tipo === "reproduccion").length;
  const cajasOcupadas = cajas.filter((c: any) => c.estado === "ocupada").length;
  const cajasLibres = cajas.filter((c: any) => c.estado === "libre").length;

  // distribucion por especie
  const porEspecie = ["ASF", "Raton", "Rata"].map((esp) => {
    const count = lotes.filter((l: any) => l.especie === esp).reduce((s: number, l: any) => s + (l.cantidad_actual || 0), 0);
    return { especie: esp, count, pct: totalIndividuos ? Math.round((count / totalIndividuos) * 100) : 0 };
  });

  const today = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="display-font text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Resumen operativo del bioterio · {profile?.nombre}</p>
        </div>
        <div className="glass-card px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          {today}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Activity} label="Individuos vivos" value={totalIndividuos} sublabel="en todos los lotes activos" iconClass="bg-primary/10 text-primary" />
        <StatCard icon={Layers} label="Lotes nacimiento" value={lotesNacimiento} sublabel="en crecimiento" iconClass="bg-accent/10 text-accent" />
        <StatCard icon={Package} label="Lotes engorda" value={lotesEngorda} sublabel="listos para venta potencial" iconClass="bg-success/10 text-success" />
        <StatCard icon={FlaskConical} label="Reproductores" value={lotesReprod} sublabel="lotes activos" iconClass="bg-warning/10 text-warning" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Package} label="Cajas ocupadas" value={`${cajasOcupadas}/${cajas.length}`} sublabel={`${cajasLibres} libres`} iconClass="bg-primary/10 text-primary" />
        <StatCard icon={GitBranch} label="Total lotes activos" value={lotes.length} sublabel="nacimiento + engorda + reprod." iconClass="bg-accent/10 text-accent" />
        <StatCard icon={Activity} label="Cajas totales" value={cajas.length} sublabel="en el bioterio" iconClass="bg-success/10 text-success" />
        <StatCard icon={Layers} label="Sub-lotes" value={lotes.filter((l: any) => l.lote_padre_id).length} sublabel="originados de divisiones" iconClass="bg-warning/10 text-warning" />
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
              {lotes.slice(0, 6).map((l: any) => {
                const dias = diasDesde(l.fecha_nacimiento);
                const etapa = etapaActual(l.especie as Especie, l.fecha_nacimiento);
                return (
                  <div key={l.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{l.codigo || l.id.slice(0, 8)}</span>
                        <Badge variant="outline" className="capitalize text-[10px]">{l.tipo}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {l.especie} · {l.lineas_geneticas?.nombre ?? "Sin línea"} · Caja: {l.cajas?.codigo ?? "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">{etapa}</p>
                      <p className="text-xs text-muted-foreground">{dias} días · {l.cantidad_actual} ind.</p>
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
            {porEspecie.map((e) => (
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
    </div>
  );
}

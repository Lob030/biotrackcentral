import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart2,
  DollarSign,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Inbox,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Periodo = "semana" | "mes" | "trimestre" | "anio";

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "trimestre", label: "Trimestre" },
  { value: "anio", label: "Este año" },
];

const ESPECIE_COLOR: Record<string, string> = {
  ASF: "#06b6d4",
  Ratón: "#a855f7",
  Raton: "#a855f7",
  Rata: "#f59e0b",
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  confirmado: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  en_preparacion: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  listo: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  entregado: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  cancelado: "bg-red-500/15 text-red-500 border-red-500/30",
};

const fmtMoney = (n: number) =>
  `$${(Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function rangoPeriodo(p: Periodo): { start: Date; end: Date; prevStart: Date; prevEnd: Date; granularidad: "dia" | "semana" | "mes" } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  let granularidad: "dia" | "semana" | "mes" = "semana";

  if (p === "semana") {
    const day = (start.getDay() + 6) % 7; // lunes=0
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    granularidad = "dia";
  } else if (p === "mes") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    granularidad = "semana";
  } else if (p === "trimestre") {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
    granularidad = "semana";
  } else {
    start = new Date(now.getFullYear(), 0, 1);
    granularidad = "mes";
  }

  const ms = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(start.getTime() - ms - 1);
  return { start, end, prevStart, prevEnd, granularidad };
}

function bucketKey(d: Date, g: "dia" | "semana" | "mes"): string {
  if (g === "dia") return d.toISOString().slice(0, 10);
  if (g === "mes") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  // semana ISO inicio-lunes
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

function bucketLabel(key: string, g: "dia" | "semana" | "mes"): string {
  if (g === "mes") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-MX", { month: "short" });
  }
  const d = new Date(key);
  if (g === "dia") return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  return `Sem ${d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}`;
}

function pctChange(curr: number, prev: number): string {
  if (!prev || prev === 0) return curr > 0 ? "N/A" : "N/A";
  const v = ((curr - prev) / prev) * 100;
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

export default function Ventas() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [topMetric, setTopMetric] = useState<"unidades" | "ingreso">("unidades");
  const [topEspecie, setTopEspecie] = useState<"todas" | "ASF" | "Ratón" | "Rata">("todas");

  const r = useMemo(() => rangoPeriodo(periodo), [periodo]);

  // ---- pedidos del periodo y previo ----
  const { data: pedidosData } = useQuery({
    queryKey: ["ventas-pedidos", orgId, periodo],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, cliente_id, fecha_pedido, subtotal, porcentaje_descuento, monto_descuento, total, estado, pedidos_detalles(id, especie, etapa, cantidad, precio_unitario, subtotal)")
        .eq("organization_id", orgId!)
        .gte("fecha_pedido", r.prevStart.toISOString().slice(0, 10))
        .lte("fecha_pedido", r.end.toISOString().slice(0, 10))
        .order("fecha_pedido", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: gastosData } = useQuery({
    queryKey: ["ventas-gastos", orgId, periodo],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gastos")
        .select("id, fecha, categoria, monto")
        .eq("organization_id", orgId!)
        .gte("fecha", r.prevStart.toISOString().slice(0, 10))
        .lte("fecha", r.end.toISOString().slice(0, 10));
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: clientesMap } = useQuery({
    queryKey: ["ventas-clientes-map", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((c) => [c.id, c.nombre]));
    },
  });

  // ---- procesamiento ----
  const procesado = useMemo(() => {
    const startKey = r.start.toISOString().slice(0, 10);
    const endKey = r.end.toISOString().slice(0, 10);
    const ped = pedidosData ?? [];
    const gas = gastosData ?? [];

    const enRango = (f: string) => f >= startKey && f <= endKey;
    const cuentaIngreso = (estado: string) => estado !== "cancelado" && estado !== "pendiente";

    const pedActuales = ped.filter((p) => enRango(p.fecha_pedido));
    const pedPrevios = ped.filter((p) => !enRango(p.fecha_pedido));

    const ingresos = pedActuales.filter((p) => cuentaIngreso(p.estado)).reduce((s, p) => s + Number(p.total || 0), 0);
    const ingresosPrev = pedPrevios.filter((p) => cuentaIngreso(p.estado)).reduce((s, p) => s + Number(p.total || 0), 0);

    const gastosActuales = gas.filter((g) => enRango(g.fecha)).reduce((s, g) => s + Number(g.monto || 0), 0);
    const gastosPrev = gas.filter((g) => !enRango(g.fecha)).reduce((s, g) => s + Number(g.monto || 0), 0);

    const numPedidos = pedActuales.length;
    const numPedidosPrev = pedPrevios.length;

    // buckets
    const buckets = new Map<string, { ingresos: number; gastos: number }>();
    pedActuales.filter((p) => cuentaIngreso(p.estado)).forEach((p) => {
      const k = bucketKey(new Date(p.fecha_pedido), r.granularidad);
      const b = buckets.get(k) ?? { ingresos: 0, gastos: 0 };
      b.ingresos += Number(p.total || 0);
      buckets.set(k, b);
    });
    gas.filter((g) => enRango(g.fecha)).forEach((g) => {
      const k = bucketKey(new Date(g.fecha), r.granularidad);
      const b = buckets.get(k) ?? { ingresos: 0, gastos: 0 };
      b.gastos += Number(g.monto || 0);
      buckets.set(k, b);
    });
    const bucketRows = [...buckets.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => ({
        label: bucketLabel(k, r.granularidad),
        ingresos: Math.round(v.ingresos * 100) / 100,
        gastos: Math.round(v.gastos * 100) / 100,
        ganancia: Math.round((v.ingresos - v.gastos) * 100) / 100,
      }));

    // top productos
    const prodMap = new Map<string, { especie: string; etapa: string; unidades: number; ingreso: number }>();
    pedActuales.filter((p) => cuentaIngreso(p.estado)).forEach((p: any) => {
      (p.pedidos_detalles ?? []).forEach((d: any) => {
        const key = `${d.especie}__${d.etapa}`;
        const cur = prodMap.get(key) ?? { especie: d.especie, etapa: d.etapa, unidades: 0, ingreso: 0 };
        cur.unidades += Number(d.cantidad || 0);
        cur.ingreso += Number(d.subtotal ?? d.cantidad * d.precio_unitario ?? 0);
        prodMap.set(key, cur);
      });
    });
    let productos = [...prodMap.values()];
    if (topEspecie !== "todas") productos = productos.filter((p) => p.especie === topEspecie);
    productos = productos
      .sort((a, b) => (topMetric === "unidades" ? b.unidades - a.unidades : b.ingreso - a.ingreso))
      .slice(0, 10)
      .map((p) => ({
        producto: `${p.especie} ${p.etapa}`,
        especie: p.especie,
        valor: topMetric === "unidades" ? p.unidades : Math.round(p.ingreso * 100) / 100,
      }));

    // donut especies
    const espMap = new Map<string, { unidades: number; ingreso: number }>();
    pedActuales.filter((p) => cuentaIngreso(p.estado)).forEach((p: any) => {
      (p.pedidos_detalles ?? []).forEach((d: any) => {
        const cur = espMap.get(d.especie) ?? { unidades: 0, ingreso: 0 };
        cur.unidades += Number(d.cantidad || 0);
        cur.ingreso += Number(d.subtotal ?? d.cantidad * d.precio_unitario ?? 0);
        espMap.set(d.especie, cur);
      });
    });
    const totalUnidades = [...espMap.values()].reduce((s, v) => s + v.unidades, 0);
    const especies = [...espMap.entries()].map(([nombre, v]) => ({
      nombre,
      unidades: v.unidades,
      ingreso: Math.round(v.ingreso * 100) / 100,
      pct: totalUnidades > 0 ? (v.unidades / totalUnidades) * 100 : 0,
      color: ESPECIE_COLOR[nombre] ?? "#64748b",
    }));

    const recientes = pedActuales.slice(0, 10);

    return {
      ingresos,
      ingresosPrev,
      gastos: gastosActuales,
      gastosPrev,
      ganancia: ingresos - gastosActuales,
      gananciaPrev: ingresosPrev - gastosPrev,
      numPedidos,
      numPedidosPrev,
      bucketRows,
      productos,
      especies,
      recientes,
    };
  }, [pedidosData, gastosData, r, topMetric, topEspecie]);

  const margen = procesado.ingresos > 0 ? (procesado.ganancia / procesado.ingresos) * 100 : 0;
  const periodoLabel = PERIODOS.find((p) => p.value === periodo)?.label ?? "";

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto animate-fade-in space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="display-font text-4xl font-bold tracking-tight flex items-center gap-3">
            <BarChart2 className="h-8 w-8 text-primary" /> Ventas & Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Métricas del negocio · {periodoLabel}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PERIODOS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={periodo === p.value ? "default" : "outline"}
              onClick={() => setPeriodo(p.value)}
              className={periodo === p.value ? "bg-gradient-primary text-primary-foreground shadow-glow" : ""}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="clientes">Mejores Clientes</TabsTrigger>
          <TabsTrigger value="gastos">Gastos</TabsTrigger>
          <TabsTrigger value="proyecciones">Proyecciones</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-6 mt-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Ingresos"
              value={fmtMoney(procesado.ingresos)}
              sub={`${pctChange(procesado.ingresos, procesado.ingresosPrev)} vs periodo anterior`}
              icon={<DollarSign className="h-5 w-5" />}
              tone="emerald"
            />
            <KpiCard
              title="Gastos"
              value={fmtMoney(procesado.gastos)}
              sub={`${pctChange(procesado.gastos, procesado.gastosPrev)} vs periodo anterior`}
              icon={<TrendingDown className="h-5 w-5" />}
              tone="red"
            />
            <KpiCard
              title="Ganancia neta"
              value={fmtMoney(procesado.ganancia)}
              sub={procesado.ingresos > 0 ? `Margen ${margen.toFixed(1)}%` : "sin datos"}
              icon={<TrendingUp className="h-5 w-5" />}
              tone={procesado.ganancia >= 0 ? "emerald" : "red"}
            />
            <KpiCard
              title="Pedidos"
              value={String(procesado.numPedidos)}
              sub={
                procesado.numPedidosPrev === 0 && procesado.numPedidos === 0
                  ? "sin datos"
                  : `${procesado.numPedidos - procesado.numPedidosPrev >= 0 ? "+" : ""}${procesado.numPedidos - procesado.numPedidosPrev} vs anterior`
              }
              icon={<ShoppingCart className="h-5 w-5" />}
              tone="blue"
            />
          </div>

          {/* Ingresos vs Gastos */}
          <Card className="glass-card p-6">
            <div className="mb-4">
              <h2 className="display-font text-lg font-semibold">Ingresos vs Gastos vs Ganancia</h2>
              <p className="text-xs text-muted-foreground">{periodoLabel}</p>
            </div>
            {procesado.bucketRows.length === 0 ? (
              <EmptyState mensaje="No hay datos para este periodo" />
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={procesado.bucketRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                      }}
                      formatter={(v: number) => fmtMoney(v)}
                    />
                    <Legend />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ganancia" name="Ganancia" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top productos */}
            <Card className="glass-card p-6">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="display-font text-lg font-semibold">Productos más vendidos</h2>
                  <p className="text-xs text-muted-foreground">Top 10 · {periodoLabel}</p>
                </div>
              </div>
              <div className="flex gap-2 mb-3 flex-wrap">
                <div className="flex gap-1 rounded-md border border-border p-0.5">
                  {(["unidades", "ingreso"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setTopMetric(m)}
                      className={`px-2.5 py-1 text-xs rounded ${
                        topMetric === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {m === "unidades" ? "Por unidades" : "Por ingreso $"}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 rounded-md border border-border p-0.5">
                  {(["todas", "ASF", "Ratón", "Rata"] as const).map((e) => (
                    <button
                      key={e}
                      onClick={() => setTopEspecie(e)}
                      className={`px-2.5 py-1 text-xs rounded ${
                        topEspecie === e ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {e === "todas" ? "Todas" : e}
                    </button>
                  ))}
                </div>
              </div>
              {procesado.productos.length === 0 ? (
                <EmptyState mensaje="No hay ventas en este periodo" />
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={procesado.productos} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="producto" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem",
                        }}
                        formatter={(v: number) => (topMetric === "unidades" ? `${v} u` : fmtMoney(v))}
                      />
                      <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                        {procesado.productos.map((p, i) => (
                          <Cell key={i} fill={ESPECIE_COLOR[p.especie] ?? "#64748b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Donut especies */}
            <Card className="glass-card p-6">
              <div className="mb-4">
                <h2 className="display-font text-lg font-semibold">Distribución por especie</h2>
                <p className="text-xs text-muted-foreground">Por unidades · {periodoLabel}</p>
              </div>
              {procesado.especies.length === 0 ? (
                <EmptyState mensaje="No hay ventas en este periodo" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={procesado.especies}
                          dataKey="unidades"
                          nameKey="nombre"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={2}
                        >
                          {procesado.especies.map((e, i) => (
                            <Cell key={i} fill={e.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.5rem",
                          }}
                          formatter={(v: number) => `${v} u`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {procesado.especies.map((e) => (
                      <div key={e.nombre} className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-sm shrink-0" style={{ background: e.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {e.pct.toFixed(1)}% · {fmtMoney(e.ingreso)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Pedidos recientes */}
          <Card className="glass-card p-6">
            <div className="mb-4">
              <h2 className="display-font text-lg font-semibold">Pedidos recientes</h2>
              <p className="text-xs text-muted-foreground">Últimos 10 del periodo</p>
            </div>
            {procesado.recientes.length === 0 ? (
              <EmptyState mensaje="No hay pedidos en este periodo" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3">N°</th>
                      <th className="py-2 pr-3">Cliente</th>
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Productos</th>
                      <th className="py-2 pr-3 text-right">Subtotal</th>
                      <th className="py-2 pr-3 text-right">Desc.</th>
                      <th className="py-2 pr-3 text-right">Total</th>
                      <th className="py-2 pr-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procesado.recientes.map((p: any) => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pr-3 font-mono text-xs">{p.numero_pedido}</td>
                        <td className="py-2 pr-3 truncate max-w-[180px]">{clientesMap?.[p.cliente_id] ?? "—"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{p.fecha_pedido}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{(p.pedidos_detalles ?? []).length}</td>
                        <td className="py-2 pr-3 text-right">{fmtMoney(Number(p.subtotal || 0))}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">
                          {Number(p.monto_descuento) > 0 ? `-${fmtMoney(Number(p.monto_descuento))}` : "—"}
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold">{fmtMoney(Number(p.total || 0))}</td>
                        <td className="py-2 pr-3">
                          <Badge variant="outline" className={`${ESTADO_BADGE[p.estado] ?? ""} text-[10px] capitalize`}>
                            {p.estado.replace("_", " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="clientes" className="mt-6">
          <Placeholder titulo="Mejores Clientes" />
        </TabsContent>
        <TabsContent value="gastos" className="mt-6">
          <Placeholder titulo="Gestión de Gastos" />
        </TabsContent>
        <TabsContent value="proyecciones" className="mt-6">
          <Placeholder titulo="Proyecciones" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
  icon,
  tone,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone: "emerald" | "red" | "blue";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-500 bg-emerald-500/10"
      : tone === "red"
      ? "text-red-500 bg-red-500/10"
      : "text-blue-500 bg-blue-500/10";
  return (
    <Card className="glass-card p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneCls}`}>{icon}</div>
      </div>
      <p className="display-font text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </Card>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <Inbox className="h-10 w-10 opacity-50" />
      <p className="text-sm">{mensaje}</p>
    </div>
  );
}

function Placeholder({ titulo }: { titulo: string }) {
  return (
    <Card className="glass-card p-12 text-center">
      <h3 className="display-font text-xl font-semibold mb-2">{titulo}</h3>
      <p className="text-sm text-muted-foreground">Próximamente.</p>
    </Card>
  );
}

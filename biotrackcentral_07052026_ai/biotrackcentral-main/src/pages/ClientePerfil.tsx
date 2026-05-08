import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  DollarSign,
  ShoppingCart,
  Target,
  Clock,
  Mail,
  Phone,
  MapPin,
  Inbox,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const fmtMoney = (n: number) =>
  `$${(Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  confirmado: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  en_preparacion: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  listo: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  entregado: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  cancelado: "bg-red-500/15 text-red-500 border-red-500/30",
};

const TIPOS: Record<string, string> = {
  general: "General",
  laboratorio: "Laboratorio",
  centro_investigacion: "Centro de Investigación",
  veterinario: "Veterinario",
};

const PAGE_SIZE = 10;

function ultimaLabel(fecha: string | null): string {
  if (!fecha) return "—";
  const d = new Date(fecha);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff < 7) return `hace ${diff} días`;
  return d.toLocaleDateString("es-MX");
}

export default function ClientePerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const [page, setPage] = useState(1);
  const [pedidoOpen, setPedidoOpen] = useState<any | null>(null);

  const { data: cliente, isLoading: loadingCliente } = useQuery({
    queryKey: ["cliente-perfil", id],
    enabled: !!id && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ["cliente-perfil-pedidos", id],
    enabled: !!id && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, pedidos_detalles(id, especie, etapa, cantidad, precio_unitario, subtotal)")
        .eq("cliente_id", id!)
        .order("fecha_pedido", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const cuenta = (e: string) => e !== "cancelado" && e !== "pendiente";
    const validos = pedidos.filter((p: any) => cuenta(p.estado));
    const total = validos.reduce((s: number, p: any) => s + Number(p.total || 0), 0);
    const ultima = validos[0]?.fecha_pedido ?? null;
    return {
      total_pedidos: validos.length,
      total_gastado: total,
      ticket_promedio: validos.length > 0 ? total / validos.length : 0,
      ultima_compra: ultima,
    };
  }, [pedidos]);

  const gastoMensual = useMemo(() => {
    const cuenta = (e: string) => e !== "cancelado" && e !== "pendiente";
    const now = new Date();
    const meses: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      meses.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }),
        total: 0,
      });
    }
    const map = new Map(meses.map((m) => [m.key, m]));
    for (const p of pedidos as any[]) {
      if (!cuenta(p.estado)) continue;
      const d = new Date(p.fecha_pedido);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = map.get(k);
      if (m) m.total += Number(p.total || 0);
    }
    return meses.map((m) => ({ ...m, total: Math.round(m.total * 100) / 100 }));
  }, [pedidos]);

  const topProductos = useMemo(() => {
    const cuenta = (e: string) => e !== "cancelado" && e !== "pendiente";
    const map = new Map<string, { producto: string; total: number }>();
    let totalUnidades = 0;
    for (const p of pedidos as any[]) {
      if (!cuenta(p.estado)) continue;
      for (const d of p.pedidos_detalles ?? []) {
        const key = `${d.especie} ${d.etapa}`;
        const cur = map.get(key) ?? { producto: key, total: 0 };
        cur.total += Number(d.cantidad || 0);
        totalUnidades += Number(d.cantidad || 0);
        map.set(key, cur);
      }
    }
    return [...map.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((p) => ({ ...p, pct: totalUnidades > 0 ? (p.total / totalUnidades) * 100 : 0 }));
  }, [pedidos]);

  const totalPages = Math.max(1, Math.ceil(pedidos.length / PAGE_SIZE));
  const paginated = pedidos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loadingCliente) {
    return (
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="p-6 md:p-8 max-w-[800px] mx-auto">
        <Button variant="ghost" onClick={() => navigate("/clientes")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Clientes
        </Button>
        <Card className="glass-card p-12 text-center">
          <p className="text-lg font-semibold mb-2">Cliente no encontrado</p>
          <p className="text-sm text-muted-foreground">El cliente solicitado no existe o no tienes acceso.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto animate-fade-in space-y-6">
      <Button variant="ghost" onClick={() => navigate("/clientes")} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Clientes
      </Button>

      {/* Header */}
      <Card className="glass-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="display-font text-3xl font-bold">{cliente.nombre}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline">{TIPOS[cliente.tipo_cliente] ?? cliente.tipo_cliente}</Badge>
              <Badge
                variant={
                  cliente.estado_cliente === "activo"
                    ? "default"
                    : cliente.estado_cliente === "bloqueado"
                    ? "destructive"
                    : "secondary"
                }
              >
                {cliente.estado_cliente}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              {cliente.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {cliente.email}
                </span>
              )}
              {cliente.telefono && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {cliente.telefono}
                </span>
              )}
              {cliente.ciudad && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {cliente.ciudad}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/clientes")}>
              Editar cliente
            </Button>
            <Button
              className="bg-gradient-primary text-primary-foreground shadow-glow"
              onClick={() => navigate("/pedidos")}
            >
              Nuevo pedido
            </Button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Total gastado" value={fmtMoney(stats.total_gastado)} icon={<DollarSign className="h-5 w-5" />} tone="emerald" />
        <Kpi title="Pedidos realizados" value={String(stats.total_pedidos)} icon={<ShoppingCart className="h-5 w-5" />} tone="blue" />
        <Kpi title="Ticket promedio" value={fmtMoney(stats.ticket_promedio)} icon={<Target className="h-5 w-5" />} tone="emerald" />
        <Kpi title="Última compra" value={ultimaLabel(stats.ultima_compra)} icon={<Clock className="h-5 w-5" />} tone="blue" />
      </div>

      {/* Gasto por mes */}
      <Card className="glass-card p-6">
        <div className="mb-4">
          <h2 className="display-font text-lg font-semibold">Gasto por mes</h2>
          <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
        </div>
        {gastoMensual.every((m) => m.total === 0) ? (
          <Empty mensaje="Sin gastos registrados" />
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gastoMensual}>
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
                <Bar dataKey="total" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Top productos */}
      <Card className="glass-card p-6">
        <div className="mb-4">
          <h2 className="display-font text-lg font-semibold">Productos más comprados</h2>
          <p className="text-xs text-muted-foreground">Top 5 históricos</p>
        </div>
        {topProductos.length === 0 ? (
          <Empty mensaje="Sin productos comprados aún" />
        ) : (
          <div className="space-y-3">
            {topProductos.map((p) => (
              <div key={p.producto}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{p.producto}</span>
                  <span className="text-muted-foreground">
                    {p.total} u · {p.pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
                  <div className="h-full bg-gradient-primary" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Historial */}
      <Card className="glass-card p-6">
        <div className="mb-4">
          <h2 className="display-font text-lg font-semibold">Historial de pedidos</h2>
          <p className="text-xs text-muted-foreground">{pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""} en total</p>
        </div>
        {loadingPedidos ? (
          <Skeleton className="h-40 w-full" />
        ) : pedidos.length === 0 ? (
          <Empty mensaje="Sin pedidos registrados aún" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">N° Pedido</th>
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Productos</th>
                    <th className="py-2 pr-3 text-right">Total</th>
                    <th className="py-2 pr-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p: any) => {
                    const resumen = (p.pedidos_detalles ?? [])
                      .map((d: any) => `${d.especie} ${d.etapa} x${d.cantidad}`)
                      .join(", ");
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition"
                        onClick={() => setPedidoOpen(p)}
                      >
                        <td className="py-2.5 pr-3 font-mono text-xs">{p.numero_pedido}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{p.fecha_pedido}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground truncate max-w-[280px]">{resumen || "—"}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold">{fmtMoney(Number(p.total || 0))}</td>
                        <td className="py-2.5 pr-3">
                          <Badge variant="outline" className={`${ESTADO_BADGE[p.estado] ?? ""} text-[10px] capitalize`}>
                            {p.estado.replace("_", " ")}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                    Anterior
                  </Button>
                  <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modal detalle pedido */}
      <Dialog open={!!pedidoOpen} onOpenChange={(o) => !o && setPedidoOpen(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="display-font">
              Pedido {pedidoOpen?.numero_pedido}
            </DialogTitle>
          </DialogHeader>
          {pedidoOpen && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="font-medium">{pedidoOpen.fecha_pedido}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge variant="outline" className={`${ESTADO_BADGE[pedidoOpen.estado] ?? ""} text-[10px] capitalize`}>
                    {pedidoOpen.estado.replace("_", " ")}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Productos</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-1.5 pr-2">Producto</th>
                      <th className="py-1.5 pr-2 text-right">Cant.</th>
                      <th className="py-1.5 pr-2 text-right">P.U.</th>
                      <th className="py-1.5 pr-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pedidoOpen.pedidos_detalles ?? []).map((d: any) => (
                      <tr key={d.id} className="border-b border-border/40">
                        <td className="py-1.5 pr-2">{d.especie} {d.etapa}</td>
                        <td className="py-1.5 pr-2 text-right">{d.cantidad}</td>
                        <td className="py-1.5 pr-2 text-right">{fmtMoney(Number(d.precio_unitario || 0))}</td>
                        <td className="py-1.5 pr-2 text-right">
                          {fmtMoney(Number(d.subtotal ?? Number(d.cantidad) * Number(d.precio_unitario)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-border pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{fmtMoney(Number(pedidoOpen.subtotal || 0))}</span>
                </div>
                {Number(pedidoOpen.monto_descuento) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Descuento ({pedidoOpen.porcentaje_descuento}%)</span>
                    <span>-{fmtMoney(Number(pedidoOpen.monto_descuento))}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-1">
                  <span>Total</span>
                  <span>{fmtMoney(Number(pedidoOpen.total || 0))}</span>
                </div>
              </div>
              {pedidoOpen.notas && (
                <p className="text-xs italic text-muted-foreground p-2 bg-secondary/40 rounded">{pedidoOpen.notas}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ title, value, icon, tone }: { title: string; value: string; icon: React.ReactNode; tone: "emerald" | "blue" | "red" }) {
  const cls =
    tone === "emerald"
      ? "text-emerald-500 bg-emerald-500/10"
      : tone === "red"
      ? "text-red-500 bg-red-500/10"
      : "text-blue-500 bg-blue-500/10";
  return (
    <Card className="glass-card p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cls}`}>{icon}</div>
      </div>
      <p className="display-font text-2xl font-bold truncate">{value}</p>
    </Card>
  );
}

function Empty({ mensaje }: { mensaje: string }) {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <Inbox className="h-10 w-10 opacity-50" />
      <p className="text-sm">{mensaje}</p>
    </div>
  );
}

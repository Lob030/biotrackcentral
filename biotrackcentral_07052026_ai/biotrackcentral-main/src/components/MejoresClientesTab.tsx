import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Inbox, Users } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const fmtMoney = (n: number) =>
  `$${(Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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

type Periodo = { start: Date; end: Date; label: string };
type SortKey = "total" | "pedidos" | "ticket";

interface Props {
  periodo: Periodo;
}

interface Row {
  id: string;
  nombre: string;
  created_at: string;
  total_pedidos: number;
  total_gastado: number;
  ticket_promedio: number;
  ultima_compra: string | null;
  total_anual: number;
  pedidos_anual: number;
}

const COLORS = ["#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#ef4444", "#64748b"];

export default function MejoresClientesTab({ periodo }: Props) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const startISO = periodo.start.toISOString().slice(0, 10);
  const endISO = periodo.end.toISOString().slice(0, 10);

  const { data: clientes = [] } = useQuery({
    queryKey: ["mejores-clientes-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre, created_at")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pedidosPeriodo = [] } = useQuery({
    queryKey: ["mejores-clientes-pedidos", orgId, startISO, endISO],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, cliente_id, fecha_pedido, total, estado")
        .eq("organization_id", orgId!)
        .gte("fecha_pedido", startISO)
        .lte("fecha_pedido", endISO);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Para badges: pedidos del último año
  const yearAgo = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { data: pedidosAnio = [] } = useQuery({
    queryKey: ["mejores-clientes-pedidos-anio", orgId, yearAgo],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("cliente_id, fecha_pedido, total, estado")
        .eq("organization_id", orgId!)
        .gte("fecha_pedido", yearAgo)
        .lte("fecha_pedido", today);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Última compra global por cliente (todos los tiempos)
  const { data: ultimasGlobal = [] } = useQuery({
    queryKey: ["mejores-clientes-ultima", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("cliente_id, fecha_pedido, estado")
        .eq("organization_id", orgId!)
        .neq("estado", "cancelado")
        .neq("estado", "pendiente")
        .order("fecha_pedido", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows: Row[] = useMemo(() => {
    const cuenta = (e: string) => e !== "cancelado" && e !== "pendiente";

    const ultimaPorCliente = new Map<string, string>();
    for (const p of ultimasGlobal as any[]) {
      if (!ultimaPorCliente.has(p.cliente_id)) ultimaPorCliente.set(p.cliente_id, p.fecha_pedido);
    }

    const anioMap = new Map<string, { total: number; pedidos: number }>();
    for (const p of pedidosAnio as any[]) {
      if (!cuenta(p.estado)) continue;
      const cur = anioMap.get(p.cliente_id) ?? { total: 0, pedidos: 0 };
      cur.total += Number(p.total || 0);
      cur.pedidos += 1;
      anioMap.set(p.cliente_id, cur);
    }

    const periodoMap = new Map<string, { total: number; pedidos: number }>();
    for (const p of pedidosPeriodo as any[]) {
      if (!cuenta(p.estado)) continue;
      const cur = periodoMap.get(p.cliente_id) ?? { total: 0, pedidos: 0 };
      cur.total += Number(p.total || 0);
      cur.pedidos += 1;
      periodoMap.set(p.cliente_id, cur);
    }

    return clientes.map((c) => {
      const per = periodoMap.get(c.id) ?? { total: 0, pedidos: 0 };
      const an = anioMap.get(c.id) ?? { total: 0, pedidos: 0 };
      return {
        id: c.id,
        nombre: c.nombre,
        created_at: c.created_at,
        total_pedidos: per.pedidos,
        total_gastado: Math.round(per.total * 100) / 100,
        ticket_promedio: per.pedidos > 0 ? Math.round((per.total / per.pedidos) * 100) / 100 : 0,
        ultima_compra: ultimaPorCliente.get(c.id) ?? null,
        total_anual: an.total,
        pedidos_anual: an.pedidos,
      };
    });
  }, [clientes, pedidosPeriodo, pedidosAnio, ultimasGlobal]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sortKey === "total" ? a.total_gastado : sortKey === "pedidos" ? a.total_pedidos : a.ticket_promedio;
      const bv = sortKey === "total" ? b.total_gastado : sortKey === "pedidos" ? b.total_pedidos : b.ticket_promedio;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const conActividad = sorted.filter((r) => r.total_pedidos > 0);
  const top5 = sorted.slice(0, 5).filter((r) => r.total_gastado > 0);
  const totalAll = sorted.reduce((s, r) => s + r.total_gastado, 0);
  const top5Sum = top5.reduce((s, r) => s + r.total_gastado, 0);
  const donut = [
    ...top5.map((r, i) => ({ name: r.nombre, value: r.total_gastado, color: COLORS[i] })),
    ...(totalAll - top5Sum > 0
      ? [{ name: "Otros", value: Math.round((totalAll - top5Sum) * 100) / 100, color: COLORS[5] }]
      : []),
  ];

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "desc" ? (
        <ArrowDown className="h-3 w-3 inline ml-1" />
      ) : (
        <ArrowUp className="h-3 w-3 inline ml-1" />
      )
    ) : null;

  if (conActividad.length === 0) {
    return (
      <Card className="glass-card p-12 text-center">
        <Inbox className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground">Sin datos en el periodo seleccionado</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="display-font text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Ranking de clientes
            </h2>
            <p className="text-xs text-muted-foreground">
              {conActividad.length} cliente{conActividad.length !== 1 ? "s" : ""} con actividad · {periodo.label}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-3 w-10">#</th>
                <th className="py-2 pr-3">Cliente</th>
                <th className="py-2 pr-3">Status</th>
                <th
                  className="py-2 pr-3 text-right cursor-pointer select-none hover:text-foreground"
                  onClick={() => toggleSort("total")}
                >
                  Total <SortIcon k="total" />
                </th>
                <th
                  className="py-2 pr-3 text-right cursor-pointer select-none hover:text-foreground"
                  onClick={() => toggleSort("pedidos")}
                >
                  Pedidos <SortIcon k="pedidos" />
                </th>
                <th
                  className="py-2 pr-3 text-right cursor-pointer select-none hover:text-foreground"
                  onClick={() => toggleSort("ticket")}
                >
                  Ticket avg <SortIcon k="ticket" />
                </th>
                <th className="py-2 pr-3">Última</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => {
                const medalla = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                const badges = computeBadges(r);
                return (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition"
                    onClick={() => navigate(`/clientes/${r.id}`)}
                  >
                    <td className="py-2.5 pr-3 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2.5 pr-3 font-medium">
                      {medalla && <span className="mr-1">{medalla}</span>}
                      {r.nombre}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex gap-1 flex-wrap">
                        {badges.map((b) => (
                          <Badge key={b.label} variant="outline" className={`text-[10px] ${b.cls}`}>
                            {b.icon} {b.label}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold">{fmtMoney(r.total_gastado)}</td>
                    <td className="py-2.5 pr-3 text-right">{r.total_pedidos}</td>
                    <td className="py-2.5 pr-3 text-right text-muted-foreground">{fmtMoney(r.ticket_promedio)}</td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">{ultimaLabel(r.ultima_compra)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {donut.length > 0 && (
        <Card className="glass-card p-6">
          <div className="mb-4">
            <h2 className="display-font text-lg font-semibold">Concentración Top 5</h2>
            <p className="text-xs text-muted-foreground">Distribución de ingresos del periodo</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {donut.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(v: number) => fmtMoney(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {donut.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-sm shrink-0" style={{ background: d.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {totalAll > 0 ? ((d.value / totalAll) * 100).toFixed(1) : 0}% · {fmtMoney(d.value)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function computeBadges(r: { created_at: string; total_anual: number; pedidos_anual: number; ultima_compra: string | null }) {
  const out: { label: string; icon: string; cls: string }[] = [];
  if (r.total_anual > 20000) out.push({ label: "VIP", icon: "🔥", cls: "bg-red-500/15 text-red-500 border-red-500/30" });
  if (r.pedidos_anual >= 12)
    out.push({ label: "Frecuente", icon: "⭐", cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" });
  const created = new Date(r.created_at);
  const daysOld = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
  if (daysOld < 90) out.push({ label: "Nuevo", icon: "🆕", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" });
  if (r.ultima_compra) {
    const days = Math.floor((Date.now() - new Date(r.ultima_compra).getTime()) / (1000 * 60 * 60 * 24));
    if (days > 30) out.push({ label: "Inactivo", icon: "💤", cls: "bg-gray-500/15 text-gray-400 border-gray-500/30" });
  }
  return out;
}

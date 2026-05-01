import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Plus,
  Pencil,
  Trash2,
  Inbox,
  ArrowUpDown,
  Repeat,
  Wallet,
  PieChart as PieIcon,
  RefreshCw,
} from "lucide-react";
import { CATEGORIAS_GASTO, CATEGORIA_MAP, fmtMoney, CategoriaGasto } from "@/lib/gastos";

type SortKey = "fecha" | "monto";
type SortDir = "asc" | "desc";

interface Periodo {
  start: Date;
  end: Date;
  label: string;
  tipo: "semana" | "mes" | "trimestre" | "anio";
}

interface FormState {
  id?: string;
  fecha: string;
  categoria: CategoriaGasto;
  descripcion: string;
  monto: string;
  proveedor: string;
  recurrente: boolean;
  notas: string;
}

const blankForm = (): FormState => ({
  fecha: new Date().toISOString().slice(0, 10),
  categoria: "alimentacion",
  descripcion: "",
  monto: "",
  proveedor: "",
  recurrente: false,
  notas: "",
});

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export default function GastosTab({ periodo }: { periodo: Periodo }) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());
  const [filtroCat, setFiltroCat] = useState<"todas" | CategoriaGasto>("todas");
  const [sortKey, setSortKey] = useState<SortKey>("fecha");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const startKey = periodo.start.toISOString().slice(0, 10);
  const endKey = periodo.end.toISOString().slice(0, 10);

  // gastos del periodo
  const { data: gastos = [], isLoading } = useQuery({
    queryKey: ["gastos-list", orgId, startKey, endKey],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gastos")
        .select("*")
        .eq("organization_id", orgId!)
        .gte("fecha", startKey)
        .lte("fecha", endKey)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // gastos recurrentes globales (independiente del periodo)
  const { data: recurrentes = [] } = useQuery({
    queryKey: ["gastos-recurrentes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gastos")
        .select("monto")
        .eq("organization_id", orgId!)
        .eq("recurrente", true);
      if (error) throw error;
      return data ?? [];
    },
  });

  // mes actual y anterior para LineChart
  const visibleLine = periodo.tipo === "mes" || periodo.tipo === "semana";
  const now = new Date();
  const curMonthStart = startOfMonth(now);
  const curMonthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const prevMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const { data: comparativaData } = useQuery({
    queryKey: ["gastos-comparativa", orgId, curMonthStart.toISOString(), prevMonthStart.toISOString()],
    enabled: !!orgId && visibleLine,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gastos")
        .select("fecha, monto")
        .eq("organization_id", orgId!)
        .gte("fecha", prevMonthStart.toISOString().slice(0, 10))
        .lte("fecha", curMonthEnd.toISOString().slice(0, 10));
      if (error) throw error;
      return data ?? [];
    },
  });

  // mutaciones
  const upsertMut = useMutation({
    mutationFn: async (f: FormState) => {
      const monto = Number(f.monto);
      if (!Number.isFinite(monto) || monto <= 0) throw new Error("Monto debe ser mayor a 0");
      if (!f.descripcion.trim()) throw new Error("Descripción requerida");
      if (!f.fecha) throw new Error("Fecha requerida");
      const payload = {
        organization_id: orgId!,
        fecha: f.fecha,
        categoria: f.categoria,
        descripcion: f.descripcion.trim(),
        monto,
        proveedor: f.proveedor.trim() || null,
        recurrente: f.recurrente,
        notas: f.notas.trim() || null,
      };
      if (f.id) {
        const { error } = await supabase
          .from("gastos")
          .update(payload)
          .eq("id", f.id)
          .eq("organization_id", orgId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("gastos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gastos-list"] });
      qc.invalidateQueries({ queryKey: ["gastos-recurrentes"] });
      qc.invalidateQueries({ queryKey: ["gastos-comparativa"] });
      qc.invalidateQueries({ queryKey: ["ventas-gastos"] });
      toast.success(form.id ? "Gasto actualizado" : "Gasto registrado");
      setOpen(false);
      setForm(blankForm());
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("gastos")
        .delete()
        .eq("id", id)
        .eq("organization_id", orgId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gastos-list"] });
      qc.invalidateQueries({ queryKey: ["gastos-recurrentes"] });
      qc.invalidateQueries({ queryKey: ["gastos-comparativa"] });
      qc.invalidateQueries({ queryKey: ["ventas-gastos"] });
      toast.success("Gasto eliminado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });

  // procesado
  const stats = useMemo(() => {
    const total = gastos.reduce((s, g: any) => s + Number(g.monto || 0), 0);
    const porCat = new Map<string, { total: number; cantidad: number }>();
    gastos.forEach((g: any) => {
      const cur = porCat.get(g.categoria) ?? { total: 0, cantidad: 0 };
      cur.total += Number(g.monto || 0);
      cur.cantidad += 1;
      porCat.set(g.categoria, cur);
    });
    const categorias = [...porCat.entries()]
      .map(([cat, v]) => {
        const def = CATEGORIA_MAP[cat] ?? CATEGORIA_MAP["otros"];
        return {
          categoria: cat,
          label: def.label,
          emoji: def.emoji,
          color: def.color,
          total: Math.round(v.total * 100) / 100,
          pct: total > 0 ? (v.total / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    const mayor = categorias[0];
    const totalRecurrentes = recurrentes.reduce((s, g: any) => s + Number(g.monto || 0), 0);

    return { total, categorias, mayor, totalRecurrentes };
  }, [gastos, recurrentes]);

  const tablaFiltrada = useMemo(() => {
    let out = [...gastos] as any[];
    if (filtroCat !== "todas") out = out.filter((g) => g.categoria === filtroCat);
    out.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "fecha") return a.fecha < b.fecha ? -1 * dir : a.fecha > b.fecha ? 1 * dir : 0;
      return (Number(a.monto) - Number(b.monto)) * dir;
    });
    return out;
  }, [gastos, filtroCat, sortKey, sortDir]);

  const totalTabla = tablaFiltrada.reduce((s, g) => s + Number(g.monto || 0), 0);

  // datos line chart: acumulado día a día
  const lineRows = useMemo(() => {
    if (!visibleLine) return [];
    const cur = new Map<number, number>();
    const prev = new Map<number, number>();
    (comparativaData ?? []).forEach((g: any) => {
      const d = new Date(g.fecha);
      const day = d.getUTCDate();
      const isCur = g.fecha >= curMonthStart.toISOString().slice(0, 10);
      const map = isCur ? cur : prev;
      map.set(day, (map.get(day) ?? 0) + Number(g.monto || 0));
    });
    const daysInCur = new Date(curMonthStart.getFullYear(), curMonthStart.getMonth() + 1, 0).getDate();
    const daysInPrev = new Date(prevMonthStart.getFullYear(), prevMonthStart.getMonth() + 1, 0).getDate();
    const maxDays = Math.max(daysInCur, daysInPrev);
    const rows: { dia: number; actual: number | null; anterior: number | null }[] = [];
    let accCur = 0;
    let accPrev = 0;
    for (let d = 1; d <= maxDays; d++) {
      if (d <= daysInCur) accCur += cur.get(d) ?? 0;
      if (d <= daysInPrev) accPrev += prev.get(d) ?? 0;
      rows.push({
        dia: d,
        actual: d <= daysInCur ? Math.round(accCur * 100) / 100 : null,
        anterior: d <= daysInPrev ? Math.round(accPrev * 100) / 100 : null,
      });
    }
    return rows;
  }, [comparativaData, visibleLine, curMonthStart, prevMonthStart]);

  const haPrev = lineRows.some((r) => (r.anterior ?? 0) > 0);

  const openCreate = () => {
    setForm(blankForm());
    setOpen(true);
  };
  const openEdit = (g: any) => {
    setForm({
      id: g.id,
      fecha: g.fecha,
      categoria: g.categoria,
      descripcion: g.descripcion ?? "",
      monto: String(g.monto ?? ""),
      proveedor: g.proveedor ?? "",
      recurrente: !!g.recurrente,
      notas: g.notas ?? "",
    });
    setOpen(true);
  };

  const onDelete = (id: string) => {
    if (!window.confirm("¿Eliminar este gasto? Esta acción no se puede deshacer.")) return;
    deleteMut.mutate(id);
  };

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="display-font text-2xl font-semibold">Gastos del bioterio</h2>
          <p className="text-xs text-muted-foreground">{periodo.label}</p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gradient-primary text-primary-foreground shadow-glow"
        >
          <Plus className="h-4 w-4" /> Registrar gasto
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total gastos</p>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-red-500/10 text-red-500">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p className="display-font text-2xl font-bold">{fmtMoney(stats.total)}</p>
          <p className="text-xs text-muted-foreground mt-1">{periodo.label.toLowerCase()}</p>
        </Card>

        <Card className="glass-card p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Mayor gasto</p>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-500">
              <PieIcon className="h-5 w-5" />
            </div>
          </div>
          {stats.mayor ? (
            <>
              <p className="display-font text-2xl font-bold">
                {stats.mayor.emoji} {stats.mayor.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {fmtMoney(stats.mayor.total)} · {stats.mayor.pct.toFixed(0)}%
              </p>
            </>
          ) : (
            <>
              <p className="display-font text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground mt-1">sin datos</p>
            </>
          )}
        </Card>

        <Card className="glass-card p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recurrentes</p>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500">
              <RefreshCw className="h-5 w-5" />
            </div>
          </div>
          <p className="display-font text-2xl font-bold">{fmtMoney(stats.totalRecurrentes)}</p>
          <p className="text-xs text-muted-foreground mt-1">/ mes (fijos)</p>
        </Card>
      </div>

      {/* Bar chart por categoría */}
      <Card className="glass-card p-6">
        <div className="mb-4">
          <h3 className="display-font text-lg font-semibold">Gastos por categoría</h3>
          <p className="text-xs text-muted-foreground">{periodo.label}</p>
        </div>
        {stats.categorias.length === 0 ? (
          <Empty mensaje="Sin gastos registrados en este periodo" />
        ) : (
          <div style={{ height: Math.max(220, stats.categorias.length * 44) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.categorias.map((c) => ({
                  name: `${c.emoji} ${c.label}`,
                  total: c.total,
                  pct: c.pct,
                  color: c.color,
                }))}
                layout="vertical"
                margin={{ left: 10, right: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={180} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  formatter={(v: number, _n, p: any) => [`${fmtMoney(v)} · ${p.payload.pct.toFixed(1)}%`, "Total"]}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} label={{ position: "right", formatter: (v: number) => fmtMoney(v), fill: "hsl(var(--foreground))", fontSize: 11 }}>
                  {stats.categorias.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Line chart comparativa */}
      {visibleLine && (
        <Card className="glass-card p-6">
          <div className="mb-4">
            <h3 className="display-font text-lg font-semibold">Gasto acumulado: este mes vs mes anterior</h3>
            <p className="text-xs text-muted-foreground">Acumulado día a día</p>
          </div>
          {lineRows.length === 0 ? (
            <Empty mensaje="Sin gastos para comparar" />
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(v: any) => (v == null ? "—" : fmtMoney(Number(v)))}
                    labelFormatter={(l) => `Día ${l}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="actual" name="Mes actual" stroke="#06b6d4" strokeWidth={2} dot={false} connectNulls />
                  {haPrev && (
                    <Line type="monotone" dataKey="anterior" name="Mes anterior" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="4 4" connectNulls />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}

      {/* Tabla */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="display-font text-lg font-semibold">Gastos registrados</h3>
            <p className="text-xs text-muted-foreground">{tablaFiltrada.length} registros</p>
          </div>
          <div className="w-56">
            <Select value={filtroCat} onValueChange={(v) => setFiltroCat(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {CATEGORIAS_GASTO.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>
        ) : tablaFiltrada.length === 0 ? (
          <Empty mensaje="No hay gastos para mostrar" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">
                    <button onClick={() => toggleSort("fecha")} className="inline-flex items-center gap-1 hover:text-foreground">
                      Fecha <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-2 pr-3">Categoría</th>
                  <th className="py-2 pr-3">Descripción</th>
                  <th className="py-2 pr-3">Proveedor</th>
                  <th className="py-2 pr-3 text-right">
                    <button onClick={() => toggleSort("monto")} className="inline-flex items-center gap-1 hover:text-foreground">
                      Monto <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-2 pr-3 text-center">Recur.</th>
                  <th className="py-2 pr-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tablaFiltrada.map((g) => {
                  const cat = CATEGORIA_MAP[g.categoria] ?? CATEGORIA_MAP["otros"];
                  const fecha = new Date(g.fecha);
                  const fechaTxt = `${String(fecha.getUTCDate()).padStart(2, "0")}/${String(
                    fecha.getUTCMonth() + 1,
                  ).padStart(2, "0")}/${fecha.getUTCFullYear()}`;
                  return (
                    <tr key={g.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 pr-3">{fechaTxt}</td>
                      <td className="py-2 pr-3">
                        <Badge
                          variant="outline"
                          style={{ borderColor: cat.color + "55", color: cat.color }}
                          className="text-[11px]"
                        >
                          {cat.emoji} {cat.label}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 max-w-[280px] truncate" title={g.descripcion}>
                        {g.descripcion}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{g.proveedor || "—"}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{fmtMoney(Number(g.monto))}</td>
                      <td className="py-2 pr-3 text-center">
                        {g.recurrente ? <Repeat className="h-4 w-4 inline text-amber-500" /> : null}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(g)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-500"
                            onClick={() => onDelete(g.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-semibold">
                  <td colSpan={4} className="py-3 pr-3 text-right text-muted-foreground">
                    Total del periodo:
                  </td>
                  <td className="py-3 pr-3 text-right">{fmtMoney(totalTabla)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar gasto" : "Registrar gasto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoría *</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as CategoriaGasto })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_GASTO.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.emoji} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descripción *</Label>
              <Input
                maxLength={200}
                placeholder="ej: Compra 25kg alimento Lab Diet"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monto *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    value={form.monto}
                    onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Proveedor</Label>
                <Input
                  maxLength={120}
                  placeholder="ej: CFE, Vetmex..."
                  value={form.proveedor}
                  onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">¿Es un gasto recurrente?</p>
                {form.recurrente && (
                  <p className="text-xs text-muted-foreground">Se considerará como gasto fijo mensual</p>
                )}
              </div>
              <Switch
                checked={form.recurrente}
                onCheckedChange={(v) => setForm({ ...form, recurrente: v })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea
                rows={2}
                maxLength={500}
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => upsertMut.mutate(form)}
              disabled={upsertMut.isPending}
              className="bg-gradient-primary text-primary-foreground"
            >
              {form.id ? "Guardar cambios" : "Registrar Gasto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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

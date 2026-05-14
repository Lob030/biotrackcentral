import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Trash, Eye, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { useClienteOptionsActivos } from "@/modules/bioterio/data/options";
import { invalidatePedidos } from "@/lib/invalidations";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSessionState } from "@/hooks/useSessionState";

interface Pedido {
  id: string;
  numero_pedido: string;
  cliente_id: string;
  fecha_pedido: string;
  estado: string;
  subtotal: number;
  porcentaje_descuento: number;
  monto_descuento: number;
  total: number;
  notas: string | null;
  clientes?: { nombre: string } | null;
}

interface DetalleLinea {
  especie: string;
  etapa: string;
  cantidad: number;
  precio_unitario: number;
}

export interface DescuentoAplicado {
  monto: number;
  porcentaje: number;
  razon: string;
}

export function calcularDescuento(subtotal: number): DescuentoAplicado | null {
  if (subtotal >= 10000) return { porcentaje: 20, monto: subtotal * 0.2, razon: "Volumen > $10,000" };
  if (subtotal >= 5000) return { porcentaje: 15, monto: subtotal * 0.15, razon: "Volumen > $5,000" };
  if (subtotal >= 2500) return { porcentaje: 10, monto: subtotal * 0.10, razon: "Volumen > $2,500" };
  if (subtotal >= 600) return { porcentaje: 5, monto: subtotal * 0.05, razon: "Volumen > $600" };
  return null;
}

export function calcularTotales(subtotal: number) {
  const descuento = calcularDescuento(subtotal);
  const montoDescuento = descuento?.monto ?? 0;
  const total = subtotal - montoDescuento;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    descuento: descuento ? { ...descuento, monto: Math.round(montoDescuento * 100) / 100 } : null,
    total: Math.round(total * 100) / 100,
  };
}

const ESTADOS_PEDIDO = [
  { value: "pendiente", label: "Pendiente", variant: "secondary" as const },
  { value: "confirmado", label: "Confirmado", variant: "default" as const },
  { value: "en_preparacion", label: "En Preparación", variant: "default" as const },
  { value: "listo", label: "Listo", variant: "default" as const },
  { value: "entregado", label: "Entregado", variant: "default" as const },
  { value: "cancelado", label: "Cancelado", variant: "destructive" as const },
];

export default function Pedidos() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useSessionState("pedidos.search", "");
  const [filterEstado, setFilterEstado] = useSessionState("pedidos.filterEstado", "all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pedido | null>(null);
  const [viewOpen, setViewOpen] = useState<Pedido | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const numeroRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => numeroRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [open]);

  const [form, setForm] = useState({
    numero_pedido: "",
    cliente_id: "",
    fecha_pedido: new Date().toISOString().slice(0, 10),
    estado: "pendiente",
    notas: "",
  });

  const [detalles, setDetalles] = useState<DetalleLinea[]>([]);
  const [newDetalle, setNewDetalle] = useState<DetalleLinea>({
    especie: "", etapa: "", cantidad: 1, precio_unitario: 0,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-species-profiles", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("workspace_species_profiles").select("*").eq("workspace_id", profile?.organization_id).eq("is_active", true);
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: sizeClasses = [] } = useQuery({
    queryKey: ["all-size-classes", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("species_size_classes").select("*").eq("workspace_id", profile?.organization_id).order("display_order");
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ["pedidos", filterEstado],
    queryFn: async () => {
      let q = supabase.from("pedidos").select("*, clientes(nombre)").order("created_at", { ascending: false });
      if (filterEstado !== "all") q = q.eq("estado", filterEstado as any);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Pedido[];
    },
  });

  const { data: clientes = [] } = useClienteOptionsActivos();

  // Stock en vivo: suma cantidad_actual de lotes activos agrupados por especie+etapa (calculada).
  const { data: stockMap = {} } = useQuery({
    queryKey: ["stock-por-etapa"],
    enabled: open,
    refetchInterval: open ? 20_000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes")
        .select("especie, fecha_nacimiento, cantidad_actual, estado, species_size_classes(name)")
        .eq("estado", "activo")
        .gt("cantidad_actual", 0);
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((l: any) => {
        const etapa = l.species_size_classes?.name;
        if (!etapa) return;
        const key = `${l.especie}__${etapa}`;
        map[key] = (map[key] ?? 0) + (l.cantidad_actual ?? 0);
      });
      return map;
    },
  });

  const stockDe = (especie: string, etapa: string) => stockMap[`${especie}__${etapa}`] ?? 0;
  const stockSeleccionado = newDetalle.etapa ? stockDe(newDetalle.especie, newDetalle.etapa) : null;
  const excedeStock = stockSeleccionado !== null && newDetalle.cantidad > stockSeleccionado;

  const subtotal = detalles.reduce((acc, d) => acc + d.cantidad * d.precio_unitario, 0);
  const { total, descuento } = calcularTotales(subtotal);

  const upsert = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Sin perfil");
      if (!form.cliente_id) throw new Error("Selecciona un cliente");
      if (detalles.length === 0) throw new Error("Agrega al menos un producto");

      const payload: any = {
        numero_pedido: form.numero_pedido,
        cliente_id: form.cliente_id,
        fecha_pedido: form.fecha_pedido,
        estado: form.estado as any,
        subtotal: Math.round(subtotal * 100) / 100,
        porcentaje_descuento: descuento?.porcentaje ?? 0,
        monto_descuento: descuento?.monto ?? 0,
        total,
        notas: form.notas || null,
        organization_id: profile.organization_id,
      };

      let pedidoId = editing?.id;

      if (editing) {
        const { error } = await supabase.from("pedidos").update(payload).eq("id", editing.id);
        if (error) throw error;
        await supabase.from("pedidos_detalles").delete().eq("pedido_id", editing.id);
      } else {
        const { data, error } = await supabase.from("pedidos").insert(payload).select("id").single();
        if (error) throw error;
        pedidoId = data?.id;
      }

      if (pedidoId && detalles.length > 0) {
        const detallesPayload = detalles.map((d) => ({
          pedido_id: pedidoId!,
          especie: d.especie,
          etapa: d.etapa,
          cantidad: d.cantidad,
          precio_unitario: Math.round(d.precio_unitario * 100) / 100,
        }));
        const { error } = await supabase.from("pedidos_detalles").insert(detallesPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidatePedidos(qc);
      setOpen(false);
      setEditing(null);
      resetForm();
      toast.success(editing ? "Pedido actualizado" : "Pedido creado");
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pedidos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidatePedidos(qc);
      toast.success("Pedido eliminado");
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const resetForm = () => {
    setForm({ numero_pedido: "", cliente_id: "", fecha_pedido: new Date().toISOString().slice(0, 10), estado: "pendiente", notas: "" });
    setDetalles([]);
    setNewDetalle({ especie: profiles.length > 0 ? profiles[0].species_id : "", etapa: "", cantidad: 1, precio_unitario: 0 });
  };

  const openNew = () => {
    setEditing(null);
    resetForm();
    // Sugerir número auto
    setForm((f) => ({ ...f, numero_pedido: `PED-${Date.now().toString().slice(-6)}` }));
    setOpen(true);
  };

  const openEdit = async (p: Pedido) => {
    setEditing(p);
    setForm({
      numero_pedido: p.numero_pedido,
      cliente_id: p.cliente_id,
      fecha_pedido: p.fecha_pedido,
      estado: p.estado,
      notas: p.notas ?? "",
    });
    const { data } = await supabase.from("pedidos_detalles").select("*").eq("pedido_id", p.id);
    setDetalles((data ?? []).map((d: any) => ({
      especie: d.especie, etapa: d.etapa, cantidad: d.cantidad, precio_unitario: Number(d.precio_unitario),
    })));
    setOpen(true);
  };

  const agregarDetalle = () => {
    if (!newDetalle.etapa || newDetalle.cantidad <= 0) {
      toast.error("Selecciona etapa y cantidad");
      return;
    }
    const disponible = stockDe(newDetalle.especie, newDetalle.etapa);
    if (newDetalle.cantidad > disponible) {
      toast.error(`No hay suficiente stock. Disponibles: ${disponible} unidades`);
      return;
    }
    let precio = newDetalle.precio_unitario;
    if (!precio) {
      const cls = sizeClasses.find((c: any) => c.name === newDetalle.etapa);
      precio = cls?.sale_price || 0;
    }
    setDetalles([...detalles, { ...newDetalle, precio_unitario: precio }]);
    setNewDetalle({ especie: newDetalle.especie, etapa: "", cantidad: 1, precio_unitario: 0 });
  };

  const quitarDetalle = (idx: number) => setDetalles(detalles.filter((_, i) => i !== idx));

  const onChangeEtapa = (etapa: string) => {
    const cls = sizeClasses.find((c: any) => c.name === etapa);
    setNewDetalle({ ...newDetalle, etapa, precio_unitario: cls?.sale_price || 0 });
  };

  const onChangeEspecie = (especie: string) => {
    setNewDetalle({ especie, etapa: "", cantidad: 1, precio_unitario: 0 });
  };

  const filtered = pedidos.filter((p) => {
    const q = debouncedSearch.toLowerCase();
    if (q && !p.numero_pedido.toLowerCase().includes(q) && !(p.clientes?.nombre ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="display-font text-4xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground mt-1">{pedidos.length} pedidos registrados</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Nuevo pedido
        </Button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por número o cliente…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ESTADOS_PEDIDO.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((p) => {
          const estado = ESTADOS_PEDIDO.find((e) => e.value === p.estado);
          return (
            <div key={p.id} className="glass-card p-4 flex items-center justify-between group hover:border-primary/40 transition flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="display-font font-bold">{p.numero_pedido}</h3>
                  <Badge variant={estado?.variant ?? "secondary"} className="text-[10px]">{estado?.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{p.clientes?.nombre ?? "—"} • {new Date(p.fecha_pedido).toLocaleDateString()}</p>
                <div className="flex gap-6 mt-2 text-sm flex-wrap">
                  <div>
                    <p className="text-muted-foreground text-xs">Subtotal</p>
                    <p className="display-font font-bold">${Number(p.subtotal).toFixed(2)}</p>
                  </div>
                  {Number(p.porcentaje_descuento) > 0 && (
                    <div className="text-success">
                      <p className="text-xs">Descuento {Number(p.porcentaje_descuento)}%</p>
                      <p className="display-font font-bold">-${Number(p.monto_descuento).toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs">Total</p>
                    <p className="display-font font-bold text-lg text-primary">${Number(p.total).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewOpen(p)}><Eye className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => { if (await confirm({ title: "¿Eliminar pedido?", description: `Se eliminará el pedido ${p.numero_pedido}. Esta acción no se puede deshacer.`, tone: "destructive", confirmLabel: "Eliminar" })) del.mutate(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="glass-card p-12 text-center text-muted-foreground">
            No hay pedidos. <button onClick={openNew} className="text-primary hover:underline">Crear uno</button>
          </div>
        )}
      </div>

      {/* Crear/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="display-font">{editing ? "Editar pedido" : "Nuevo pedido"}</DialogTitle></DialogHeader>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); upsert.mutate(); }}>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Número *</Label>
                <Input ref={numeroRef} value={form.numero_pedido} onChange={(e) => setForm({ ...form, numero_pedido: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={form.fecha_pedido} onChange={(e) => setForm({ ...form, fecha_pedido: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS_PEDIDO.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Instrucciones…" />
              </div>
            </div>

            <div className="border-t border-border/60 pt-4">
              <h4 className="display-font font-bold mb-3">Productos</h4>

              <div className="bg-secondary/30 rounded-lg p-3 mb-4">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    <Label className="text-xs">Especie</Label>
                    <Select value={newDetalle.especie} onValueChange={(v: any) => onChangeEspecie(v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {profiles.map((p: any) => (
                          <SelectItem key={p.species_id} value={p.species_id}>{p.operational_name || p.species_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs">Etapa</Label>
                    <Select value={newDetalle.etapa} onValueChange={onChangeEtapa}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {sizeClasses.filter((c: any) => {
                          const p = profiles.find((pr: any) => pr.species_id === newDetalle.especie);
                          return p && c.species_profile_id === p.id;
                        }).map((c: any) => {
                          const stk = stockDe(newDetalle.especie, c.name);
                          const sin = stk <= 0;
                          return (
                            <SelectItem key={c.name} value={c.name}>
                              <span className={sin ? "text-destructive line-through" : ""}>
                                {c.name} · ${(c.sale_price || 0).toFixed(2)}
                                {sin ? " (sin stock)" : ` · ${stk}u`}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Cantidad</Label>
                    <Input type="number" min={1} value={newDetalle.cantidad}
                      onChange={(e) => setNewDetalle({ ...newDetalle, cantidad: parseInt(e.target.value) || 1 })}
                      className={`h-9 ${excedeStock ? "border-destructive focus-visible:ring-destructive" : ""}`} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Precio U.</Label>
                    <Input type="number" min={0} step="0.01" value={newDetalle.precio_unitario}
                      onChange={(e) => setNewDetalle({ ...newDetalle, precio_unitario: parseFloat(e.target.value) || 0 })}
                      className="h-9" />
                  </div>
                  <div className="col-span-1">
                    <Button onClick={agregarDetalle} disabled={excedeStock || !newDetalle.etapa} size="icon" className="h-9 w-9"><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>

                {/* Stock en vivo + validación */}
                {newDetalle.etapa && (
                  <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Stock disponible:</span>
                      <span className={`display-font font-bold text-lg ${stockSeleccionado && stockSeleccionado > 0 ? "text-success" : "text-destructive"}`}>
                        {stockSeleccionado ?? 0} unidades
                      </span>
                    </div>
                    {excedeStock && (
                      <div className="flex items-center gap-1.5 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>No hay suficiente stock. Disponibles: {stockSeleccionado} unidades</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {detalles.length > 0 && (
                <div className="space-y-2">
                  {detalles.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-background border border-border/60 rounded p-2 text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{d.especie} · {d.etapa}</p>
                        <p className="text-xs text-muted-foreground">{d.cantidad} × ${d.precio_unitario.toFixed(2)} = ${(d.cantidad * d.precio_unitario).toFixed(2)}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => quitarDetalle(idx)}><Trash className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {detalles.length > 0 && (
              <div className="border-t border-border/60 pt-4 space-y-2 bg-secondary/20 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-bold">${subtotal.toFixed(2)}</span>
                </div>
                {descuento && (
                  <div className="flex justify-between text-sm text-success">
                    <span>{descuento.razon} ({descuento.porcentaje}%):</span>
                    <span className="font-bold">-${descuento.monto.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg border-t border-border/60 pt-2">
                  <span className="display-font font-bold">Total:</span>
                  <span className="display-font font-bold text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
            )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              type="submit"
              disabled={!form.numero_pedido || !form.cliente_id || detalles.length === 0 || upsert.isPending}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              {editing ? "Guardar" : "Crear pedido"}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vista */}
      {viewOpen && (
        <Dialog open={!!viewOpen} onOpenChange={() => setViewOpen(null)}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader><DialogTitle className="display-font">{viewOpen.numero_pedido}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-bold">{viewOpen.clientes?.nombre}</p></div>
                <div><p className="text-muted-foreground text-xs">Fecha</p><p className="font-bold">{new Date(viewOpen.fecha_pedido).toLocaleDateString()}</p></div>
                <div><p className="text-muted-foreground text-xs">Estado</p><p className="font-bold">{ESTADOS_PEDIDO.find((e) => e.value === viewOpen.estado)?.label}</p></div>
                <div><p className="text-muted-foreground text-xs">Total</p><p className="display-font font-bold text-lg text-primary">${Number(viewOpen.total).toFixed(2)}</p></div>
              </div>
              <div className="border-t border-border/60 pt-3 space-y-1 text-sm">
                <p className="text-muted-foreground">Subtotal: <span className="text-foreground font-medium">${Number(viewOpen.subtotal).toFixed(2)}</span></p>
                {Number(viewOpen.porcentaje_descuento) > 0 && (
                  <p className="text-success">Descuento {Number(viewOpen.porcentaje_descuento)}%: -${Number(viewOpen.monto_descuento).toFixed(2)}</p>
                )}
              </div>
              {viewOpen.notas && (
                <div className="border-t border-border/60 pt-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Notas</p>
                  <p className="text-sm">{viewOpen.notas}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewOpen(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

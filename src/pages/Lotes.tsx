import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Scissors, GitFork, Skull, DollarSign, ArrowRightLeft, Eye } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { Link } from "react-router-dom";
import { etapaActual, diasDesde, type Especie } from "@/lib/etapas";
import EventoDialog, { type EventoTipo } from "@/components/EventoDialog";
import { useCajaOptions, useLineaGeneticaOptions } from "@/data/options";
import { useLotesList } from "@/data/lotes";
import { invalidateLotes } from "@/lib/invalidations";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Layers as LayersIcon } from "lucide-react";

interface Lote {
  id: string;
  codigo: string | null;
  tipo: "nacimiento" | "engorda" | "reproduccion";
  especie: Especie;
  linea_genetica_id: string | null;
  caja_id: string | null;
  fecha_nacimiento: string;
  fecha_nacimiento_original: string | null;
  fecha_introduccion_caja: string | null;
  cantidad_inicial: number | null;
  cantidad_actual: number | null;
  machos: number | null;
  hembras: number | null;
  estado: "activo" | "dividido" | "finalizado";
  lote_padre_id: string | null;
  sexo: "machos" | "hembras" | "mixto" | null;
  notas: string | null;
  lineas_geneticas?: { nombre: string; color_etiqueta: string } | null;
  cajas?: { codigo: string } | null;
}

export default function Lotes() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterEsp, setFilterEsp] = useState("all");
  const [filterEstado, setFilterEstado] = useState("activo");
  const [open, setOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState<Lote | null>(null);
  const [editing, setEditing] = useState<Lote | null>(null);
  const [eventoLote, setEventoLote] = useState<Lote | null>(null);
  const [eventoTipo, setEventoTipo] = useState<EventoTipo>("mortalidad");

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    codigo: "", tipo: "nacimiento" as const, especie: "Raton" as Especie,
    linea_genetica_id: "", caja_id: "",
    fecha_nacimiento: today, fecha_introduccion_caja: "",
    cantidad_inicial: "", cantidad_actual: "", machos: "", hembras: "", notas: "",
  });

  const lotesQuery = useLotesList({ estado: filterEstado }) as ReturnType<typeof useLotesList> & { data: Lote[] };
  const lotes = (lotesQuery.data ?? []) as Lote[];
  const isLoading = lotesQuery.isLoading;
  const isFetching = lotesQuery.isFetching;
  const lotesError = lotesQuery.error;

  const { data: lineas = [] } = useLineaGeneticaOptions();
  const { data: cajas = [] } = useCajaOptions();

  const upsert = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Sin perfil");
      const payload: any = {
        codigo: form.codigo || null,
        tipo: form.tipo,
        especie: form.especie,
        linea_genetica_id: form.linea_genetica_id || null,
        caja_id: form.caja_id || null,
        fecha_nacimiento: form.fecha_nacimiento,
        fecha_introduccion_caja: form.fecha_introduccion_caja || null,
        cantidad_inicial: form.cantidad_inicial ? parseInt(form.cantidad_inicial) : 0,
        cantidad_actual: form.cantidad_actual ? parseInt(form.cantidad_actual) : (form.cantidad_inicial ? parseInt(form.cantidad_inicial) : 0),
        machos: form.machos ? parseInt(form.machos) : 0,
        hembras: form.hembras ? parseInt(form.hembras) : 0,
        notas: form.notas || null,
        organization_id: profile.organization_id,
      };
      if (editing) {
        const { error } = await supabase.from("lotes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lotes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateLotes(qc);
      setOpen(false); setEditing(null);
      toast.success(editing ? "Lote actualizado" : "Lote creado");
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateLotes(qc); toast.success("Lote eliminado"); },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const openNew = () => {
    setEditing(null);
    setForm({ codigo: "", tipo: "nacimiento", especie: "Raton", linea_genetica_id: "", caja_id: "", fecha_nacimiento: today, fecha_introduccion_caja: "", cantidad_inicial: "", cantidad_actual: "", machos: "", hembras: "", notas: "" });
    setOpen(true);
  };

  const openEdit = (l: Lote) => {
    setEditing(l);
    setForm({
      codigo: l.codigo ?? "", tipo: l.tipo as any, especie: l.especie,
      linea_genetica_id: l.linea_genetica_id ?? "", caja_id: l.caja_id ?? "",
      fecha_nacimiento: l.fecha_nacimiento, fecha_introduccion_caja: l.fecha_introduccion_caja ?? "",
      cantidad_inicial: l.cantidad_inicial?.toString() ?? "", cantidad_actual: l.cantidad_actual?.toString() ?? "",
      machos: l.machos?.toString() ?? "", hembras: l.hembras?.toString() ?? "", notas: l.notas ?? "",
    });
    setOpen(true);
  };

  const filtered = useMemo(
    () =>
      lotes.filter((l) => {
        if (filterTipo !== "all" && l.tipo !== filterTipo) return false;
        if (filterEsp !== "all" && l.especie !== filterEsp) return false;
        return true;
      }),
    [lotes, filterTipo, filterEsp],
  );

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Lotes</h1>
          <p className="page-subtitle tabular-nums">{filtered.length} {filtered.length === 1 ? "lote" : "lotes"}</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Nuevo lote
        </Button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="nacimiento">Nacimiento</SelectItem>
            <SelectItem value="engorda">Engorda</SelectItem>
            <SelectItem value="reproduccion">Reproducción</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEsp} onValueChange={setFilterEsp}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las especies</SelectItem>
            <SelectItem value="ASF">ASF</SelectItem>
            <SelectItem value="Raton">Ratón</SelectItem>
            <SelectItem value="Rata">Rata</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="dividido">Dividido</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {lotesError ? (
        <ErrorState error={lotesError} onRetry={() => lotesQuery.refetch()} />
      ) : isLoading ? (
        <ListSkeleton rows={5} />
      ) : (
        <div className={`space-y-3 transition-opacity ${isFetching ? "opacity-70" : ""}`}>
          {filtered.map((l) => {
            const dias = diasDesde(l.fecha_nacimiento);
            const etapa = etapaActual(l.especie, l.fecha_nacimiento);
            return (
              <div key={l.id} className="glass-card p-5 flex items-center gap-4 flex-wrap group hover:border-primary/40 transition">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link to={`/lotes/${l.id}`} className="display-font text-lg font-bold hover:text-primary transition-colors">
                      {l.codigo || l.id.slice(0, 8)}
                    </Link>
                    {l.lote_padre_id && <Badge variant="outline" className="text-[10px] gap-1"><GitFork className="h-3 w-3" /> sub-lote</Badge>}
                    <Badge variant="outline" className="capitalize text-[10px]">{l.tipo}</Badge>
                    <Badge variant="outline" className="text-[10px]">{l.especie}</Badge>
                    <Badge className="text-[10px] capitalize" variant={l.estado === "activo" ? "default" : "secondary"}>{l.estado}</Badge>
                  </div>
                  {l.sexo && <p className="text-xs text-muted-foreground capitalize">{l.sexo === "machos" ? "♂ Machos" : l.sexo === "hembras" ? "♀ Hembras" : "Mixto"}</p>}
                </div>

                <div className="min-w-[150px]">
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Línea genética</p>
                  <p className="text-sm font-medium">{l.lineas_geneticas?.nombre ?? "Sin línea"}</p>
                  <p className="text-xs text-muted-foreground">Caja: {l.cajas?.codigo ?? "—"}</p>
                </div>

                <div className="min-w-[150px]">
                  <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Etapa actual</p>
                  <p className="text-sm font-medium">{etapa}</p>
                  <p className="text-xs text-muted-foreground">{dias} días · {l.cantidad_actual} ind.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  {l.estado === "activo" && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10" title="Mortalidad" onClick={() => { setEventoLote(l); setEventoTipo("mortalidad"); }}>
                        <Skull className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-success/80 hover:text-success hover:bg-success/10" title="Venta" onClick={() => { setEventoLote(l); setEventoTipo("venta"); }}>
                        <DollarSign className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-primary/80 hover:text-primary hover:bg-primary/10" title="Trasladar" onClick={() => { setEventoLote(l); setEventoTipo("traslado_caja"); }}>
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {l.tipo === "nacimiento" && l.estado === "activo" && (
                    <Button size="sm" variant="outline" onClick={() => setSplitOpen(l)} className="border-primary/40 text-primary hover:bg-primary/10">
                      <Scissors className="h-3.5 w-3.5 mr-1" /> Dividir
                    </Button>
                  )}
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Ver detalle" asChild>
                      <Link to={`/lotes/${l.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("¿Eliminar lote?")) del.mutate(l.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <EmptyState
              icon={LayersIcon}
              title="No hay lotes"
              description="No se encontraron lotes con los filtros seleccionados."
              action={
                <Button onClick={openNew} variant="outline">
                  <Plus className="h-4 w-4 mr-1" /> Crear el primero
                </Button>
              }
            />
          )}
        </div>
      )}

      <EventoDialog lote={eventoLote} tipo={eventoTipo} open={!!eventoLote} onClose={() => setEventoLote(null)} />

      {/* Form modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="display-font">{editing ? "Editar lote" : "Nuevo lote"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Ej: NAC-001" /></div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v: any) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacimiento">Nacimiento</SelectItem>
                    <SelectItem value="engorda">Engorda</SelectItem>
                    <SelectItem value="reproduccion">Reproducción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Especie *</Label>
                <Select value={form.especie} onValueChange={(v: any) => setForm({ ...form, especie: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Raton">Ratón</SelectItem>
                    <SelectItem value="Rata">Rata</SelectItem>
                    <SelectItem value="ASF">ASF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de nacimiento *</Label>
                <Input type="date" value={form.fecha_nacimiento} onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Línea genética</Label>
                <Select value={form.linea_genetica_id || "none"} onValueChange={(v) => setForm({ ...form, linea_genetica_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sin línea asignada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin línea asignada</SelectItem>
                    {lineas.filter((l: any) => l.especie === form.especie).map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Caja</Label>
                <Select value={form.caja_id || "none"} onValueChange={(v) => setForm({ ...form, caja_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Sin caja" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin caja asignada</SelectItem>
                    {cajas.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.codigo} ({c.uso})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Cantidad inicial</Label><Input type="number" value={form.cantidad_inicial} onChange={(e) => setForm({ ...form, cantidad_inicial: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cantidad actual</Label><Input type="number" value={form.cantidad_actual} onChange={(e) => setForm({ ...form, cantidad_actual: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Machos</Label><Input type="number" value={form.machos} onChange={(e) => setForm({ ...form, machos: e.target.value })} /></div>
              <div className="space-y-2"><Label>Hembras</Label><Input type="number" value={form.hembras} onChange={(e) => setForm({ ...form, hembras: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending} className="bg-gradient-primary text-primary-foreground hover:opacity-90">{editing ? "Guardar" : "Crear lote"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split modal */}
      <DividirLoteModal lote={splitOpen} onClose={() => setSplitOpen(null)} cajas={cajas as any} />
    </div>
  );
}

function DividirLoteModal({ lote, onClose, cajas }: { lote: Lote | null; onClose: () => void; cajas: { id: string; codigo: string; uso: string }[] }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [machos, setMachos] = useState("");
  const [hembras, setHembras] = useState("");
  const [cajaMachos, setCajaMachos] = useState("");
  const [cajaHembras, setCajaHembras] = useState("");

  const dividir = useMutation({
    mutationFn: async () => {
      if (!lote || !profile) throw new Error("Sin lote");
      const m = parseInt(machos) || 0;
      const h = parseInt(hembras) || 0;
      const today = new Date().toISOString().slice(0, 10);
      const fechaOriginal = lote.fecha_nacimiento_original ?? lote.fecha_nacimiento;
      const inserts: any[] = [];
      if (m > 0) inserts.push({
        codigo: `${lote.codigo}-M`, tipo: "engorda", especie: lote.especie,
        linea_genetica_id: lote.linea_genetica_id, caja_id: cajaMachos || null,
        fecha_nacimiento: lote.fecha_nacimiento, fecha_nacimiento_original: fechaOriginal,
        fecha_introduccion_caja: today, cantidad_inicial: m, cantidad_actual: m,
        machos: m, hembras: 0, sexo: "machos", lote_padre_id: lote.id,
        organization_id: profile.organization_id,
      });
      if (h > 0) inserts.push({
        codigo: `${lote.codigo}-H`, tipo: "engorda", especie: lote.especie,
        linea_genetica_id: lote.linea_genetica_id, caja_id: cajaHembras || null,
        fecha_nacimiento: lote.fecha_nacimiento, fecha_nacimiento_original: fechaOriginal,
        fecha_introduccion_caja: today, cantidad_inicial: h, cantidad_actual: h,
        machos: 0, hembras: h, sexo: "hembras", lote_padre_id: lote.id,
        organization_id: profile.organization_id,
      });
      if (inserts.length === 0) throw new Error("Especifica al menos uno de los grupos");
      const { error: e1 } = await supabase.from("lotes").insert(inserts);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("lotes").update({ estado: "dividido", cantidad_actual: 0 }).eq("id", lote.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      invalidateLotes(qc);
      toast.success("Lote dividido en sub-lotes");
      onClose();
      setMachos(""); setHembras(""); setCajaMachos(""); setCajaHembras("");
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  if (!lote) return null;
  const total = (parseInt(machos) || 0) + (parseInt(hembras) || 0);
  const exceeds = total > (lote.cantidad_actual ?? 0);

  return (
    <Dialog open={!!lote} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="display-font">Dividir lote · {lote.codigo}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Disponibles: <strong className="text-foreground">{lote.cantidad_actual} individuos</strong>. Crearemos sub-lotes de engorda separados por sexo.</p>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>♂ Machos</Label>
              <Input type="number" value={machos} onChange={(e) => setMachos(e.target.value)} />
              <Select value={cajaMachos || "none"} onValueChange={(v) => setCajaMachos(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Caja para machos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin caja</SelectItem>
                  {cajas.filter((c) => c.uso === "engorda").map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>♀ Hembras</Label>
              <Input type="number" value={hembras} onChange={(e) => setHembras(e.target.value)} />
              <Select value={cajaHembras || "none"} onValueChange={(v) => setCajaHembras(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Caja para hembras" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin caja</SelectItem>
                  {cajas.filter((c) => c.uso === "engorda").map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {exceeds && <p className="text-xs text-destructive">El total ({total}) supera la cantidad disponible.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => dividir.mutate()} disabled={total === 0 || exceeds || dividir.isPending} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Scissors className="h-4 w-4 mr-1" /> Dividir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

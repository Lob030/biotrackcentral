import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import {
  useLineasList,
  useLineasIndividuosCount,
  useUpsertLinea,
  useDeleteLinea,
} from "@/data/lineasGeneticas";
import type { LineaGeneticaRow } from "@/lib/types";
import { useConfirm } from "@/components/ui/confirm-dialog";

const COLORS = ["#06b6d4", "#10b981", "#a855f7", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#f97316", "#14b8a6", "#8b5cf6"];

type Linea = LineaGeneticaRow;

export default function LineasGeneticas() {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [filterEsp, setFilterEsp] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Linea | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    especie: "Raton" as "ASF" | "Raton" | "Rata",
    origen: "",
    fecha_registro: new Date().toISOString().slice(0, 10),
    color_etiqueta: COLORS[0],
    notas: "",
  });

  const { data: lineas = [] } = useLineasList();
  const { data: lotesCount = {} } = useLineasIndividuosCount();

  const upsert = useUpsertLinea({
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
      toast.success(editing ? "Línea actualizada" : "Línea creada");
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const del = useDeleteLinea({
    onSuccess: () => toast.success("Línea eliminada"),
    onError: (e) => toast.error(friendlyError(e)),
  });

  const submit = () => {
    if (!profile) {
      toast.error(friendlyError(new Error("Sin perfil")));
      return;
    }
    upsert.mutate({
      id: editing?.id,
      payload: { ...form, organization_id: profile.organization_id },
    });
  };

  const openNew = () => {
    setEditing(null);
    setForm({ nombre: "", especie: "Raton", origen: "", fecha_registro: new Date().toISOString().slice(0, 10), color_etiqueta: COLORS[0], notas: "" });
    setOpen(true);
  };

  const openEdit = (l: Linea) => {
    setEditing(l);
    setForm({
      nombre: l.nombre,
      especie: l.especie,
      origen: l.origen ?? "",
      fecha_registro: l.fecha_registro ?? new Date().toISOString().slice(0, 10),
      color_etiqueta: l.color_etiqueta ?? COLORS[0],
      notas: l.notas ?? "",
    });
    setOpen(true);
  };

  const filtered = lineas.filter((l) => {
    if (filterEsp !== "all" && l.especie !== filterEsp) return false;
    const q = search.toLowerCase();
    if (q && !l.nombre.toLowerCase().includes(q) && !(l.origen ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="display-font text-4xl font-bold tracking-tight">Líneas Genéticas</h1>
          <p className="text-muted-foreground mt-1">{lineas.length} líneas registradas</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Nueva línea
        </Button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nombre u origen…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterEsp} onValueChange={setFilterEsp}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las especies</SelectItem>
            <SelectItem value="ASF">ASF</SelectItem>
            <SelectItem value="Raton">Ratón</SelectItem>
            <SelectItem value="Rata">Rata</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((l) => (
          <div key={l.id} className="glass-card p-5 group hover:border-primary/40 transition">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-1.5 self-stretch rounded-full" style={{ background: l.color_etiqueta ?? "#06b6d4" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="display-font text-lg font-bold truncate">{l.nombre}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => { if (await confirm({ title: "¿Eliminar línea genética?", description: `Se eliminará "${l.nombre}". Esta acción no se puede deshacer.`, tone: "destructive", confirmLabel: "Eliminar" })) del.mutate(l.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <Badge variant="outline" className="mt-1 text-[10px]">{l.especie}</Badge>
              </div>
            </div>

            <div className="rounded-lg bg-secondary/40 p-3 mb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Individuos activos</p>
              <p className="display-font text-2xl font-bold mt-1">{lotesCount[l.id] ?? 0}</p>
            </div>

            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Origen: {l.origen || "—"}</p>
              <p>Registrada: {l.fecha_registro || "—"}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full glass-card p-12 text-center text-muted-foreground">
            No hay líneas que coincidan. <button onClick={openNew} className="text-primary hover:underline">Crear una</button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle className="display-font">{editing ? "Editar línea" : "Nueva línea genética"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
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
                <Label>Fecha registro</Label>
                <Input type="date" value={form.fecha_registro} onChange={(e) => setForm({ ...form, fecha_registro: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Origen</Label>
              <Input value={form.origen} onChange={(e) => setForm({ ...form, origen: e.target.value })} placeholder="Ej: Charles River, INTA…" />
            </div>
            <div className="space-y-2">
              <Label>Color de etiqueta</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, color_etiqueta: c })} className={`h-8 w-8 rounded-full transition ${form.color_etiqueta === c ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : ""}`} style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={!form.nombre || upsert.isPending} className="bg-gradient-primary text-primary-foreground hover:opacity-90">{editing ? "Guardar" : "Crear línea"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

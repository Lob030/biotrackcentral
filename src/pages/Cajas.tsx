import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useCajasList, useUpsertCaja, useDeleteCaja } from "@/data/cajas";
import type { CajaRow } from "@/lib/types";

type Caja = CajaRow;

const ESTADO_COLORS = {
  libre: "bg-success/15 text-success border-success/30",
  ocupada: "bg-warning/15 text-warning border-warning/30",
  limpieza: "bg-primary/15 text-primary border-primary/30",
};

export default function Cajas() {
  const { profile } = useAuth();
  const [filterUso, setFilterUso] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Caja | null>(null);

  const [form, setForm] = useState({
    codigo: "",
    ubicacion: "",
    capacidad: "",
    uso: "engorda" as "reproductor" | "engorda",
    estado: "libre" as "libre" | "ocupada" | "limpieza",
    notas: "",
  });

  const { data: cajas = [] } = useCajasList();

  const upsert = useUpsertCaja({
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
      toast.success(editing ? "Caja actualizada" : "Caja creada");
    },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const del = useDeleteCaja({
    onSuccess: () => toast.success("Caja eliminada"),
    onError: (e) => toast.error(friendlyError(e)),
  });

  const submit = () => {
    if (!profile) {
      toast.error(friendlyError(new Error("Sin perfil")));
      return;
    }
    upsert.mutate({
      id: editing?.id,
      payload: {
        codigo: form.codigo,
        ubicacion: form.ubicacion || null,
        capacidad: form.capacidad ? parseInt(form.capacidad) : null,
        uso: form.uso,
        estado: form.estado,
        notas: form.notas || null,
        organization_id: profile.organization_id,
      },
    });
  };

  const openNew = () => {
    setEditing(null);
    setForm({ codigo: "", ubicacion: "", capacidad: "", uso: "engorda", estado: "libre", notas: "" });
    setOpen(true);
  };

  const openEdit = (c: Caja) => {
    setEditing(c);
    setForm({
      codigo: c.codigo, ubicacion: c.ubicacion ?? "", capacidad: c.capacidad?.toString() ?? "",
      uso: c.uso, estado: c.estado, notas: c.notas ?? "",
    });
    setOpen(true);
  };

  const filtered = cajas.filter((c) => {
    if (filterUso !== "all" && c.uso !== filterUso) return false;
    if (filterEstado !== "all" && c.estado !== filterEstado) return false;
    return true;
  });

  const stats = {
    reproductoras: cajas.filter((c) => c.uso === "reproductor").length,
    engorda: cajas.filter((c) => c.uso === "engorda").length,
    ocupadas: cajas.filter((c) => c.estado === "ocupada").length,
    libres: cajas.filter((c) => c.estado === "libre").length,
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="display-font text-4xl font-bold tracking-tight">Cajas</h1>
          <p className="text-muted-foreground mt-1">{cajas.length} cajas · {stats.ocupadas} ocupadas · {stats.libres} libres</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Nueva caja
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Reproductoras", value: stats.reproductoras },
          { label: "Engorda", value: stats.engorda },
          { label: "Ocupadas", value: stats.ocupadas },
          { label: "Libres", value: stats.libres },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="display-font text-3xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <Select value={filterUso} onValueChange={setFilterUso}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los usos</SelectItem>
            <SelectItem value="reproductor">Reproductor</SelectItem>
            <SelectItem value="engorda">Engorda</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="libre">Libre</SelectItem>
            <SelectItem value="ocupada">Ocupada</SelectItem>
            <SelectItem value="limpieza">Limpieza</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div key={c.id} className="glass-card p-5 group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="display-font text-xl font-bold">{c.codigo}</h3>
                <p className="text-xs text-muted-foreground capitalize">{c.uso}</p>
              </div>
              <span className={cn("text-[10px] px-2 py-1 rounded-full border capitalize font-medium", ESTADO_COLORS[c.estado])}>{c.estado}</span>
            </div>
            {c.ubicacion && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5 text-primary" /> {c.ubicacion}
              </p>
            )}
            <p className="text-sm text-muted-foreground">Capacidad: {c.capacidad ?? "—"}</p>
            <div className="border-t border-border/60 mt-4 pt-3 flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition">
              <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("¿Eliminar caja?")) del.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar</Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full glass-card p-12 text-center text-muted-foreground">No hay cajas. <button onClick={openNew} className="text-primary hover:underline">Crear una</button></div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="display-font">{editing ? "Editar caja" : "Nueva caja"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Ej: R-01" />
              </div>
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} placeholder="Ej: Sala A, estante 2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Uso *</Label>
                <Select value={form.uso} onValueChange={(v: any) => setForm({ ...form, uso: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engorda">Engorda</SelectItem>
                    <SelectItem value="reproductor">Reproductor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v: any) => setForm({ ...form, estado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="libre">Libre</SelectItem>
                    <SelectItem value="ocupada">Ocupada</SelectItem>
                    <SelectItem value="limpieza">Limpieza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Capacidad (individuos)</Label>
              <Input type="number" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutate()} disabled={!form.codigo || upsert.isPending} className="bg-gradient-primary text-primary-foreground hover:opacity-90">{editing ? "Guardar" : "Crear caja"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

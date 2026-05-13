import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { clearErrorsOnDialogClose, optionalTrimmedString, requiredTrimmedString, toNullIfBlank } from "@/lib/form-utils";
import { cn } from "@/lib/utils";
import { useCajasList, useUpsertCaja, useDeleteCaja } from "@/modules/bioterio/data/cajas";
import type { CajaRow } from "@/lib/types";
import { CardGridSkeleton } from "@/components/ui/list-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useSessionState } from "@/hooks/useSessionState";

type Caja = CajaRow;

const cajaFormSchema = z.object({
  codigo: requiredTrimmedString("El codigo es obligatorio"),
  ubicacion: optionalTrimmedString(),
  capacidad: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[0-9]+$/.test(v), "Capacidad debe ser un número entero")
    .refine((v) => v === "" || Number(v) >= 0, "Capacidad no puede ser negativa"),
  uso: z.enum(["reproductor", "engorda"]),
  estado: z.enum(["libre", "ocupada", "limpieza"]),
  notas: optionalTrimmedString(),
});

type CajaFormValues = z.infer<typeof cajaFormSchema>;

const ESTADO_COLORS = {
  libre: "bg-success/15 text-success border-success/30",
  ocupada: "bg-warning/15 text-warning border-warning/30",
  limpieza: "bg-primary/15 text-primary border-primary/30",
};

export default function Cajas() {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const [filterUso, setFilterUso] = useSessionState("cajas.filterUso", "all");
  const [filterEstado, setFilterEstado] = useSessionState("cajas.filterEstado", "all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Caja | null>(null);
  const codigoRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => codigoRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [open]);

  const form = useForm<CajaFormValues>({
    resolver: zodResolver(cajaFormSchema),
    defaultValues: {
      codigo: "",
      ubicacion: "",
      capacidad: "",
      uso: "engorda",
      estado: "libre",
      notas: "",
    },
    mode: "onBlur",
  });

  const cajasQuery = useCajasList();
  const cajas = cajasQuery.data ?? [];

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

  const submit = (values: CajaFormValues) => {
    if (!profile) {
      toast.error(friendlyError(new Error("Sin perfil")));
      return;
    }
    upsert.mutate({
      id: editing?.id,
      payload: {
        codigo: values.codigo.trim(),
        ubicacion: toNullIfBlank(values.ubicacion),
        capacidad: values.capacidad ? Number(values.capacidad) : null,
        uso: values.uso,
        estado: values.estado,
        notas: toNullIfBlank(values.notas),
        organization_id: profile.organization_id,
      },
    });
  };

  const openNew = () => {
    setEditing(null);
    form.reset({ codigo: "", ubicacion: "", capacidad: "", uso: "engorda", estado: "libre", notas: "" });
    setOpen(true);
  };

  const openEdit = (c: Caja) => {
    setEditing(c);
    form.reset({
      codigo: c.codigo, ubicacion: c.ubicacion ?? "", capacidad: c.capacidad?.toString() ?? "",
      uso: c.uso, estado: c.estado, notas: c.notas ?? "",
    });
    setOpen(true);
  };

  const filtered = useMemo(
    () =>
      cajas.filter((c) => {
        if (filterUso !== "all" && c.uso !== filterUso) return false;
        if (filterEstado !== "all" && c.estado !== filterEstado) return false;
        return true;
      }),
    [cajas, filterUso, filterEstado],
  );

  const stats = useMemo(
    () => ({
      reproductoras: cajas.filter((c) => c.uso === "reproductor").length,
      engorda: cajas.filter((c) => c.uso === "engorda").length,
      ocupadas: cajas.filter((c) => c.estado === "ocupada").length,
      libres: cajas.filter((c) => c.estado === "libre").length,
    }),
    [cajas],
  );

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cajas</h1>
          <p className="page-subtitle">{cajas.length} cajas · {stats.ocupadas} ocupadas · {stats.libres} libres</p>
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

      {cajasQuery.error ? (
        <ErrorState error={cajasQuery.error} onRetry={() => cajasQuery.refetch()} />
      ) : cajasQuery.isLoading ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${cajasQuery.isFetching ? "opacity-70" : ""}`}>
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
                <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { if (await confirm({ title: "¿Eliminar caja?", description: `Se eliminará la caja "${c.codigo}". Esta acción no se puede deshacer.`, tone: "destructive", confirmLabel: "Eliminar" })) del.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar</Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={Package}
                title="No hay cajas"
                description="No se encontraron cajas con los filtros seleccionados."
                action={
                  <Button onClick={openNew} variant="outline">
                    <Plus className="h-4 w-4 mr-1" /> Crear una caja
                  </Button>
                }
              />
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => clearErrorsOnDialogClose(next, setOpen, form)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="display-font">{editing ? "Editar caja" : "Nueva caja"}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input ref={codigoRef} value={form.watch("codigo")} onChange={(e) => form.setValue("codigo", e.target.value, { shouldValidate: true })} placeholder="Ej: R-01" />
                {form.formState.errors.codigo && <p className="text-xs text-destructive">{form.formState.errors.codigo.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input value={form.watch("ubicacion") ?? ""} onChange={(e) => form.setValue("ubicacion", e.target.value, { shouldValidate: true })} placeholder="Ej: Sala A, estante 2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Uso *</Label>
                <Select value={form.watch("uso")} onValueChange={(v: "reproductor" | "engorda") => form.setValue("uso", v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engorda">Engorda</SelectItem>
                    <SelectItem value="reproductor">Reproductor</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.uso && <p className="text-xs text-destructive">{form.formState.errors.uso.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.watch("estado")} onValueChange={(v: "libre" | "ocupada" | "limpieza") => form.setValue("estado", v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="libre">Libre</SelectItem>
                    <SelectItem value="ocupada">Ocupada</SelectItem>
                    <SelectItem value="limpieza">Limpieza</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.estado && <p className="text-xs text-destructive">{form.formState.errors.estado.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Capacidad (individuos)</Label>
              <Input type="number" min={0} step={1} value={form.watch("capacidad")} onChange={(e) => form.setValue("capacidad", e.target.value, { shouldValidate: true })} />
              {form.formState.errors.capacidad && <p className="text-xs text-destructive">{form.formState.errors.capacidad.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.watch("notas") ?? ""} onChange={(e) => form.setValue("notas", e.target.value, { shouldValidate: true })} rows={2} />
            </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending} className="bg-gradient-primary text-primary-foreground hover:opacity-90">{editing ? "Guardar" : "Crear caja"}</Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

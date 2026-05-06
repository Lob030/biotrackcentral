import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Pencil, Trash2, Plus, Settings2, Sparkles, Bell } from "lucide-react";
import { toast } from "sonner";
import { ALERTAS_SISTEMA } from "@/lib/alertasSistema";
import { ETAPAS } from "@/lib/etapas";
import { invalidateAlertasPersonalizadas, invalidateAlertasSistema } from "@/lib/invalidations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TipoCustom = "recordatorio" | "condicion" | "fecha";

interface CustomForm {
  id?: string;
  nombre: string;
  emoji: string;
  mensaje: string;
  tipo: TipoCustom;
  se_repite: boolean;
  cada_x_dias: number | "";
  condicion_tipo: string;
  condicion_referencia: string;
  condicion_operador: string;
  condicion_valor_1: number | "";
  condicion_valor_2: number | "";
  fecha_tipo: string;
  fecha_dia_mes: number | "";
  fecha_unica: string;
  activa: boolean;
}

const emptyForm: CustomForm = {
  nombre: "",
  emoji: "📌",
  mensaje: "",
  tipo: "recordatorio",
  se_repite: false,
  cada_x_dias: 7,
  condicion_tipo: "lote_cantidad",
  condicion_referencia: "",
  condicion_operador: "menor",
  condicion_valor_1: "",
  condicion_valor_2: "",
  fecha_tipo: "dia_mes",
  fecha_dia_mes: 1,
  fecha_unica: "",
  activa: true,
};

export default function AdministrarAlertasModal({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomForm | null>(null);

  // Profile para org id
  const { data: profile } = useQuery({
    queryKey: ["profile-self"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user?.id ?? "")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const orgId = profile?.organization_id;

  const { data: sistemaConfig = [] } = useQuery({
    queryKey: ["alertas_sistema_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_sistema_config")
        .select("*");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const { data: customs = [] } = useQuery({
    queryKey: ["alertas_personalizadas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_personalizadas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const { data: lotes = [] } = useQuery({
    queryKey: ["lotes-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lotes")
        .select("id, codigo, especie")
        .eq("estado", "activo");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const sistemaMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const c of sistemaConfig as any[]) m[c.alerta_key] = c.activa;
    return m;
  }, [sistemaConfig]);

  const toggleSistema = useMutation({
    mutationFn: async ({ key, activa }: { key: string; activa: boolean }) => {
      if (!orgId) throw new Error("Sin organización");
      const existing = (sistemaConfig as any[]).find((c) => c.alerta_key === key);
      if (existing) {
        const { error } = await supabase
          .from("alertas_sistema_config")
          .update({ activa })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("alertas_sistema_config")
          .insert({ organization_id: orgId, alerta_key: key, activa });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      invalidateAlertasSistema(qc);
      toast.success(vars.activa ? "Alerta activada" : "Alerta desactivada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleCustom = useMutation({
    mutationFn: async ({ id, activa }: { id: string; activa: boolean }) => {
      const { error } = await supabase
        .from("alertas_personalizadas")
        .update({ activa })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidateAlertasPersonalizadas(qc);
      toast.success(vars.activa ? "Alerta activada" : "Alerta desactivada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeCustom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alertas_personalizadas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAlertasPersonalizadas(qc);
      toast.success("Alerta eliminada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const upsertCustom = useMutation({
    mutationFn: async (form: CustomForm) => {
      if (!orgId) throw new Error("Sin organización");
      if (!form.nombre.trim()) throw new Error("El nombre es obligatorio");
      if (!form.mensaje.trim()) throw new Error("El mensaje es obligatorio");

      const payload: any = {
        organization_id: orgId,
        nombre: form.nombre.trim(),
        emoji: form.emoji || "📌",
        mensaje: form.mensaje.trim(),
        tipo: form.tipo,
        activa: form.activa,
        se_repite: false,
        cada_x_dias: null,
        condicion_tipo: null,
        condicion_referencia: null,
        condicion_operador: null,
        condicion_valor_1: null,
        condicion_valor_2: null,
        fecha_tipo: null,
        fecha_dia_mes: null,
        fecha_unica: null,
      };

      if (form.tipo === "recordatorio") {
        payload.se_repite = form.se_repite;
        if (form.se_repite) {
          if (!form.cada_x_dias || +form.cada_x_dias <= 0)
            throw new Error("Cada cuántos días debe ser mayor a 0");
          payload.cada_x_dias = +form.cada_x_dias;
        }
      } else if (form.tipo === "condicion") {
        if (!form.condicion_tipo || !form.condicion_operador || form.condicion_valor_1 === "")
          throw new Error("Completa la condición");
        if (
          ["lote_cantidad", "lote_dias", "cliente_inactivo"].includes(form.condicion_tipo) &&
          !form.condicion_referencia
        )
          throw new Error("Selecciona una referencia");
        payload.condicion_tipo = form.condicion_tipo;
        payload.condicion_referencia = form.condicion_referencia || null;
        payload.condicion_operador = form.condicion_operador;
        payload.condicion_valor_1 = +form.condicion_valor_1;
        payload.condicion_valor_2 =
          form.condicion_operador === "entre" && form.condicion_valor_2 !== ""
            ? +form.condicion_valor_2
            : null;
      } else if (form.tipo === "fecha") {
        payload.fecha_tipo = form.fecha_tipo;
        if (form.fecha_tipo === "dia_mes") {
          const d = +form.fecha_dia_mes;
          if (!d || d < 1 || d > 31) throw new Error("Día entre 1 y 31");
          payload.fecha_dia_mes = d;
        } else {
          if (!form.fecha_unica) throw new Error("Selecciona una fecha");
          if (new Date(form.fecha_unica) < new Date(new Date().toDateString()))
            throw new Error("La fecha no puede ser pasada");
          payload.fecha_unica = form.fecha_unica;
        }
      }

      if (form.id) {
        const { error } = await supabase
          .from("alertas_personalizadas")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase
          .from("alertas_personalizadas")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateAlertasPersonalizadas(qc);
      toast.success(editing?.id ? "Alerta actualizada" : "Alerta creada");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing({ ...emptyForm });
    setFormOpen(true);
  };

  const openEdit = (c: any) => {
    setEditing({
      id: c.id,
      nombre: c.nombre,
      emoji: c.emoji || "📌",
      mensaje: c.mensaje,
      tipo: c.tipo,
      se_repite: !!c.se_repite,
      cada_x_dias: c.cada_x_dias ?? 7,
      condicion_tipo: c.condicion_tipo ?? "lote_cantidad",
      condicion_referencia: c.condicion_referencia ?? "",
      condicion_operador: c.condicion_operador ?? "menor",
      condicion_valor_1: c.condicion_valor_1 ?? "",
      condicion_valor_2: c.condicion_valor_2 ?? "",
      fecha_tipo: c.fecha_tipo ?? "dia_mes",
      fecha_dia_mes: c.fecha_dia_mes ?? 1,
      fecha_unica: c.fecha_unica ?? "",
      activa: c.activa,
    });
    setFormOpen(true);
  };

  const describirCustom = (c: any) => {
    if (c.tipo === "recordatorio")
      return c.se_repite ? `Cada ${c.cada_x_dias} días` : "Recordatorio único";
    if (c.tipo === "condicion") {
      const opMap: Record<string, string> = {
        igual: "=",
        menor: "<",
        mayor: ">",
        entre: "entre",
      };
      const op = opMap[c.condicion_operador] ?? c.condicion_operador;
      let ref = c.condicion_referencia ?? "";
      if (c.condicion_tipo === "lote_cantidad" || c.condicion_tipo === "lote_dias") {
        const l = (lotes as any[]).find((x) => x.id === c.condicion_referencia);
        ref = l?.codigo ?? "lote";
      } else if (c.condicion_tipo === "cliente_inactivo") {
        const cl = (clientes as any[]).find((x) => x.id === c.condicion_referencia);
        ref = cl?.nombre ?? "cliente";
      }
      const campo = {
        lote_cantidad: "cantidad",
        lote_dias: "días activos",
        stock_etapa: `stock ${c.condicion_referencia ?? ""}`,
        cliente_inactivo: "días sin comprar",
        gastos_mes: "gastos del mes",
      }[c.condicion_tipo as string] ?? "";
      const refTxt =
        c.condicion_tipo === "stock_etapa" || c.condicion_tipo === "gastos_mes"
          ? campo
          : `${ref} (${campo})`;
      const v2 = c.condicion_valor_2 != null ? ` y ${c.condicion_valor_2}` : "";
      return `Si ${refTxt} ${op} ${c.condicion_valor_1}${v2}`;
    }
    if (c.tipo === "fecha") {
      if (c.fecha_tipo === "dia_mes") return `Día ${c.fecha_dia_mes} de cada mes`;
      if (c.fecha_unica) {
        const [y, m, d] = c.fecha_unica.split("-");
        return `${d}/${m}/${y}`;
      }
    }
    return "";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Administrar alertas
            </DialogTitle>
            <DialogDescription>
              Activa o desactiva las alertas estándar y gestiona tus alertas personalizadas.
            </DialogDescription>
          </DialogHeader>

          {/* SISTEMA */}
          <section className="space-y-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> Alertas del sistema
              </h3>
              <p className="text-sm text-muted-foreground">
                Estas alertas son estándares de BioTrack Central. Solo puedes activarlas o desactivarlas.
              </p>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alerta</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[140px]">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALERTAS_SISTEMA.map((a) => {
                    const activa = sistemaMap[a.key] ?? true;
                    return (
                      <TableRow key={a.key}>
                        <TableCell className="font-medium">
                          <span className="mr-2">{a.emoji}</span>
                          {a.nombre}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {a.descripcion}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() =>
                              toggleSistema.mutate({ key: a.key, activa: !activa })
                            }
                            className="transition-all"
                          >
                            <Badge
                              variant={activa ? "default" : "destructive"}
                              className={
                                activa
                                  ? "bg-success/15 text-success hover:bg-success/25 border-success/30"
                                  : "bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/30"
                              }
                            >
                              {activa ? "✓ Activa" : "✕ Inactiva"}
                            </Badge>
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          <div className="border-t my-4" />

          {/* PERSONALIZADAS */}
          <section className="space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Mis alertas personalizadas
                </h3>
                <p className="text-sm text-muted-foreground">
                  Alertas que tú has creado para tu bioterio.
                </p>
              </div>
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Crear alerta personalizada
              </Button>
            </div>

            {customs.length === 0 ? (
              <div className="border rounded-lg p-8 text-center">
                <p className="text-muted-foreground text-sm mb-3">
                  No has creado alertas personalizadas.
                </p>
                <Button variant="outline" size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" /> Crear tu primera alerta
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alerta</TableHead>
                      <TableHead>Tipo / Parámetros</TableHead>
                      <TableHead className="w-[140px]">Estado</TableHead>
                      <TableHead className="w-[120px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(customs as any[]).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <span className="mr-2">{c.emoji}</span>
                          {c.nombre}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {describirCustom(c)}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() =>
                              toggleCustom.mutate({ id: c.id, activa: !c.activa })
                            }
                            className="transition-all"
                          >
                            <Badge
                              className={
                                c.activa
                                  ? "bg-success/15 text-success hover:bg-success/25 border-success/30"
                                  : "bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/30"
                              }
                            >
                              {c.activa ? "✓ Activa" : "✕ Inactiva"}
                            </Badge>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (
                                  confirm(
                                    "¿Eliminar esta alerta? No podrás recuperarla.",
                                  )
                                ) {
                                  removeCustom.mutate(c.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crear / Editar */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {editing?.id ? "Editar alerta" : "Crear alerta personalizada"}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Tipo de alerta</Label>
                <RadioGroup
                  value={editing.tipo}
                  onValueChange={(v) =>
                    setEditing({ ...editing, tipo: v as TipoCustom })
                  }
                  className="grid grid-cols-3 gap-2 mt-1"
                >
                  {[
                    { v: "recordatorio", label: "📋 Recordatorio" },
                    { v: "condicion", label: "⚠️ Por condición" },
                    { v: "fecha", label: "📅 Por fecha" },
                  ].map((o) => (
                    <label
                      key={o.v}
                      className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer text-sm ${
                        editing.tipo === o.v
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <RadioGroupItem value={o.v} />
                      {o.label}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="grid grid-cols-[1fr_80px] gap-2">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={editing.nombre}
                    onChange={(e) =>
                      setEditing({ ...editing, nombre: e.target.value })
                    }
                    placeholder="Ej: Revisar inventario de viruta"
                  />
                </div>
                <div>
                  <Label>Emoji</Label>
                  <Input
                    value={editing.emoji}
                    onChange={(e) =>
                      setEditing({ ...editing, emoji: e.target.value })
                    }
                    maxLength={4}
                  />
                </div>
              </div>

              <div>
                <Label>Mensaje *</Label>
                <Textarea
                  value={editing.mensaje}
                  onChange={(e) =>
                    setEditing({ ...editing, mensaje: e.target.value })
                  }
                  placeholder="Mensaje que se mostrará en la alerta"
                  rows={2}
                />
              </div>

              {editing.tipo === "recordatorio" && (
                <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editing.se_repite}
                      onCheckedChange={(v) =>
                        setEditing({ ...editing, se_repite: v })
                      }
                    />
                    <Label>Se repite periódicamente</Label>
                  </div>
                  {editing.se_repite && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Cada</span>
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        value={editing.cada_x_dias}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            cada_x_dias: e.target.value === "" ? "" : +e.target.value,
                          })
                        }
                      />
                      <span className="text-sm">días</span>
                    </div>
                  )}
                </div>
              )}

              {editing.tipo === "condicion" && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  <div>
                    <Label>Monitorear</Label>
                    <Select
                      value={editing.condicion_tipo}
                      onValueChange={(v) =>
                        setEditing({
                          ...editing,
                          condicion_tipo: v,
                          condicion_referencia: "",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lote_cantidad">Lote → cantidad de animales</SelectItem>
                        <SelectItem value="lote_dias">Lote → días activos</SelectItem>
                        <SelectItem value="stock_etapa">Stock de etapa</SelectItem>
                        <SelectItem value="cliente_inactivo">Cliente → días sin comprar</SelectItem>
                        <SelectItem value="gastos_mes">Gastos del mes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(editing.condicion_tipo === "lote_cantidad" ||
                    editing.condicion_tipo === "lote_dias") && (
                    <div>
                      <Label>Lote</Label>
                      <Select
                        value={editing.condicion_referencia}
                        onValueChange={(v) =>
                          setEditing({ ...editing, condicion_referencia: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un lote" />
                        </SelectTrigger>
                        <SelectContent>
                          {(lotes as any[]).map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.codigo || l.id.slice(0, 6)} · {l.especie}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {editing.condicion_tipo === "stock_etapa" && (
                    <div>
                      <Label>Etapa</Label>
                      <Select
                        value={editing.condicion_referencia}
                        onValueChange={(v) =>
                          setEditing({ ...editing, condicion_referencia: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          {(["ASF", "Raton", "Rata"] as const).flatMap((esp) =>
                            ETAPAS[esp].map((e) => (
                              <SelectItem
                                key={`${esp}-${e.nombre}`}
                                value={`${esp}|${e.nombre}`}
                              >
                                {esp} · {e.nombre}
                              </SelectItem>
                            )),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {editing.condicion_tipo === "cliente_inactivo" && (
                    <div>
                      <Label>Cliente</Label>
                      <Select
                        value={editing.condicion_referencia}
                        onValueChange={(v) =>
                          setEditing({ ...editing, condicion_referencia: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {(clientes as any[]).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Operador</Label>
                      <Select
                        value={editing.condicion_operador}
                        onValueChange={(v) =>
                          setEditing({ ...editing, condicion_operador: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="menor">es menor que</SelectItem>
                          <SelectItem value="mayor">es mayor que</SelectItem>
                          <SelectItem value="igual">es igual a</SelectItem>
                          <SelectItem value="entre">está entre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valor</Label>
                      <Input
                        type="number"
                        value={editing.condicion_valor_1}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            condicion_valor_1:
                              e.target.value === "" ? "" : +e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {editing.condicion_operador === "entre" && (
                    <div>
                      <Label>Y valor máximo</Label>
                      <Input
                        type="number"
                        value={editing.condicion_valor_2}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            condicion_valor_2:
                              e.target.value === "" ? "" : +e.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {editing.tipo === "fecha" && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  <RadioGroup
                    value={editing.fecha_tipo}
                    onValueChange={(v) =>
                      setEditing({ ...editing, fecha_tipo: v })
                    }
                    className="flex gap-4"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="dia_mes" /> Día específico del mes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="fecha_unica" /> Fecha única
                    </label>
                  </RadioGroup>

                  {editing.fecha_tipo === "dia_mes" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Día</span>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        className="w-20"
                        value={editing.fecha_dia_mes}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            fecha_dia_mes:
                              e.target.value === "" ? "" : +e.target.value,
                          })
                        }
                      />
                      <span className="text-sm">de cada mes</span>
                    </div>
                  ) : (
                    <div>
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={editing.fecha_unica}
                        onChange={(e) =>
                          setEditing({ ...editing, fecha_unica: e.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => editing && upsertCustom.mutate(editing)}
              disabled={upsertCustom.isPending}
            >
              {editing?.id ? "Guardar cambios" : "Crear alerta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

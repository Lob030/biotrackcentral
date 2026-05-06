import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Mail, Phone, MapPin, Eye } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { useClientesList, useUpsertCliente, useDeleteCliente } from "@/data/clientes";
import type { ClienteRow } from "@/lib/types";

type Cliente = ClienteRow;

const TIPOS_CLIENTE = [
  { value: "general", label: "General" },
  { value: "laboratorio", label: "Laboratorio" },
  { value: "centro_investigacion", label: "Centro de Investigación" },
  { value: "veterinario", label: "Veterinario" },
];

const ESTADOS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
  { value: "bloqueado", label: "Bloqueado" },
];

export default function Clientes() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterEstado, setFilterEstado] = useState("activo");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    contacto_principal: "",
    email: "",
    telefono: "",
    direccion: "",
    ciudad: "",
    rfc: "",
    tipo_cliente: "general",
    estado_cliente: "activo",
    notas: "",
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes", filterEstado],
    queryFn: async () => {
      let q = supabase.from("clientes").select("*").order("created_at", { ascending: false });
      if (filterEstado !== "all") q = q.eq("estado_cliente", filterEstado as any);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Sin perfil");
      const payload = {
        nombre: form.nombre,
        contacto_principal: form.contacto_principal || null,
        email: form.email || null,
        telefono: form.telefono || null,
        direccion: form.direccion || null,
        ciudad: form.ciudad || null,
        rfc: form.rfc || null,
        tipo_cliente: form.tipo_cliente as any,
        estado_cliente: form.estado_cliente as any,
        notas: form.notas || null,
        organization_id: profile.organization_id,
      };
      if (editing) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setOpen(false);
      setEditing(null);
      toast.success(editing ? "Cliente actualizado" : "Cliente creado");
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente eliminado");
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      nombre: "", contacto_principal: "", email: "", telefono: "", direccion: "",
      ciudad: "", rfc: "", tipo_cliente: "general", estado_cliente: "activo", notas: "",
    });
    setOpen(true);
  };

  const openEdit = (c: Cliente) => {
    setEditing(c);
    setForm({
      nombre: c.nombre,
      contacto_principal: c.contacto_principal ?? "",
      email: c.email ?? "",
      telefono: c.telefono ?? "",
      direccion: c.direccion ?? "",
      ciudad: c.ciudad ?? "",
      rfc: c.rfc ?? "",
      tipo_cliente: c.tipo_cliente,
      estado_cliente: c.estado_cliente,
      notas: c.notas ?? "",
    });
    setOpen(true);
  };

  const filtered = clientes.filter((c) => {
    if (filterTipo !== "all" && c.tipo_cliente !== filterTipo) return false;
    const q = search.toLowerCase();
    if (q && !c.nombre.toLowerCase().includes(q) && !(c.email ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="display-font text-4xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">{clientes.length} clientes registrados</p>
        </div>
        <Button onClick={openNew} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Nuevo cliente
        </Button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nombre o email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {TIPOS_CLIENTE.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ESTADOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const tipo = TIPOS_CLIENTE.find((t) => t.value === c.tipo_cliente);
          const estado = ESTADOS.find((e) => e.value === c.estado_cliente);
          return (
            <div
              key={c.id}
              onClick={() => navigate(`/clientes/${c.id}`)}
              className="glass-card p-5 group hover:border-primary/40 transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="display-font text-lg font-bold truncate">{c.nombre}</h3>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{tipo?.label}</Badge>
                    <Badge
                      variant={c.estado_cliente === "activo" ? "default" : c.estado_cliente === "bloqueado" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {estado?.label}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Ver perfil" onClick={() => navigate(`/clientes/${c.id}`)}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("¿Eliminar cliente?")) del.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                {c.contacto_principal && <p className="font-medium text-foreground">{c.contacto_principal}</p>}
                {c.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span className="truncate">{c.email}</span></div>}
                {c.telefono && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /><span>{c.telefono}</span></div>}
                {c.ciudad && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /><span>{c.ciudad}</span></div>}
              </div>

              {c.notas && <p className="text-[11px] mt-3 p-2 rounded bg-secondary/40 italic text-muted-foreground">{c.notas}</p>}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full glass-card p-12 text-center text-muted-foreground">
            No hay clientes que coincidan. <button onClick={openNew} className="text-primary hover:underline">Crear uno</button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle className="display-font">{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo_cliente} onValueChange={(v) => setForm({ ...form, tipo_cliente: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_CLIENTE.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado_cliente} onValueChange={(v) => setForm({ ...form, estado_cliente: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contacto principal</Label>
              <Input value={form.contacto_principal} onChange={(e) => setForm({ ...form, contacto_principal: e.target.value })} placeholder="Ej: Dra. María García" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Teléfono</Label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Dirección</Label><Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Ciudad</Label><Input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} /></div>
              <div className="space-y-2"><Label>RFC</Label><Input value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsert.mutate()} disabled={!form.nombre || upsert.isPending} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              {editing ? "Guardar" : "Crear cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

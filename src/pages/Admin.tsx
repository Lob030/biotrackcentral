import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Users, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

type AppRole = "admin" | "trabajador";

export default function Admin() {
  const { profile, role } = useAuth();
  const qc = useQueryClient();
  const [orgNombre, setOrgNombre] = useState("");

  const { data: org } = useQuery({
    queryKey: ["org", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile!.organization_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  useEffect(() => {
    if (org?.nombre) setOrgNombre(org.nombre);
  }, [org]);

  const { data: miembros = [] } = useQuery({
    queryKey: ["org-miembros", profile?.organization_id],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", profile!.organization_id);
      if (error) throw error;
      const ids = (profiles ?? []).map((p) => p.id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("*")
        .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      return (profiles ?? []).map((p) => ({
        ...p,
        role: (roles ?? []).find((r) => r.user_id === p.id)?.role as AppRole | undefined,
      }));
    },
    enabled: !!profile,
  });

  const updateOrg = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("organizations")
        .update({ nombre: orgNombre })
        .eq("id", profile!.organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org"] });
      toast.success("Organización actualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // borrar rol existente y crear el nuevo (un solo rol por usuario en este flujo)
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-miembros"] });
      toast.success("Rol actualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="display-font text-4xl font-bold tracking-tight flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" /> Administración
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gestiona tu organización y los miembros del equipo.
        </p>
      </div>

      {/* Organización */}
      <section className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="display-font text-lg font-semibold">Organización</h2>
        </div>
        <div className="flex gap-3 items-end max-w-xl">
          <div className="flex-1 space-y-2">
            <Label>Nombre</Label>
            <Input value={orgNombre} onChange={(e) => setOrgNombre(e.target.value)} />
          </div>
          <Button
            onClick={() => updateOrg.mutate()}
            disabled={updateOrg.isPending || !orgNombre || orgNombre === org?.nombre}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
        </div>
      </section>

      {/* Miembros */}
      <section className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="display-font text-lg font-semibold">
              Miembros ({miembros.length})
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Para invitar nuevos miembros, comparte el enlace de la app y pídeles que se
            registren con su correo.
          </p>
        </div>

        <div className="divide-y divide-border/60">
          {miembros.map((m) => (
            <div
              key={m.id}
              className="py-3 flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
                  {m.nombre?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{m.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email ?? "—"}</p>
                </div>
                {m.id === profile?.id && (
                  <Badge variant="outline" className="text-[10px]">
                    Tú
                  </Badge>
                )}
              </div>
              <Select
                value={m.role ?? "trabajador"}
                onValueChange={(v: AppRole) =>
                  updateRole.mutate({ userId: m.id, newRole: v })
                }
                disabled={m.id === profile?.id}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="trabajador">Trabajador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

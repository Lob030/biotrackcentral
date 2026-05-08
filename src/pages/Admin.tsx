import { useState, useEffect, useRef } from "react";
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
import { Building2, Users, Save, Shield, Image as ImageIcon, Upload, Trash2, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { Navigate } from "react-router-dom";
import AIAliasesManager from "@/components/ai/AIAliasesManager";

type AppRole = "admin" | "trabajador";

export default function Admin() {
  const { profile, role, organization, refreshOrganization } = useAuth();
  const qc = useQueryClient();
  const [orgNombre, setOrgNombre] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    onError: (e: any) => toast.error(friendlyError(e)),
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
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato no soportado. Usa PNG, JPG, WEBP o SVG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande (máx 2MB).");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${profile!.organization_id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("org-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase
        .from("organizations")
        .update({ logo_url: url })
        .eq("id", profile!.organization_id);
      if (dbErr) throw dbErr;
      await refreshOrganization();
      qc.invalidateQueries({ queryKey: ["org"] });
      toast.success("Logo actualizado");
    } catch (err: any) {
      toast.error(friendlyError(err));
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    try {
      // Try to remove known extensions; ignore errors
      const exts = ["png", "jpg", "jpeg", "webp", "svg"];
      await supabase.storage
        .from("org-logos")
        .remove(exts.map((e) => `${profile!.organization_id}/logo.${e}`));
      const { error } = await supabase
        .from("organizations")
        .update({ logo_url: null })
        .eq("id", profile!.organization_id);
      if (error) throw error;
      await refreshOrganization();
      qc.invalidateQueries({ queryKey: ["org"] });
      toast.success("Logo eliminado");
    } catch (err: any) {
      toast.error(friendlyError(err));
    } finally {
      setUploadingLogo(false);
    }
  };

  if (role !== "admin") return <Navigate to="/dashboard" replace />;

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

      {/* Logo del bioterio */}
      <section className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h2 className="display-font text-lg font-semibold">Logo del bioterio</h2>
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow overflow-hidden border border-border/40">
            {organization?.logo_url ? (
              <img
                src={organization.logo_url}
                alt="Logo del bioterio"
                className="h-full w-full object-cover"
              />
            ) : (
              <FlaskConical className="h-8 w-8 text-primary-foreground" strokeWidth={2.5} />
            )}
          </div>
          <div className="flex-1 min-w-[240px] space-y-2">
            <p className="text-sm text-muted-foreground">
              Sube una imagen cuadrada (PNG, JPG, WEBP o SVG, máx 2MB). Se mostrará en el menú lateral.
            </p>
            <div className="flex gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoFile}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploadingLogo ? "Subiendo..." : organization?.logo_url ? "Reemplazar logo" : "Subir logo"}
              </Button>
              {organization?.logo_url && (
                <Button
                  variant="outline"
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Quitar
                </Button>
              )}
            </div>
          </div>
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

      <AIAliasesManager />
    </div>
  );
}

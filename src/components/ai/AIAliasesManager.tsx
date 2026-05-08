import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Tag, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type EntityType = "caja" | "lote" | "linea_genetica" | "cliente";

const ENTITY_LABELS: Record<EntityType, string> = {
  caja: "Caja",
  lote: "Lote",
  linea_genetica: "Línea genética",
  cliente: "Cliente",
};

interface Alias {
  id: string;
  alias: string;
  entity_type: EntityType;
  entity_ref: string;
}

export default function AIAliasesManager() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const orgId = profile?.organization_id;

  const [alias, setAlias] = useState("");
  const [entityType, setEntityType] = useState<EntityType>("caja");
  const [entityRef, setEntityRef] = useState("");

  const { data: aliases = [], isLoading } = useQuery({
    queryKey: ["ai_aliases", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_aliases" as any)
        .select("id, alias, entity_type, entity_ref")
        .order("alias", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Alias[];
    },
    enabled: !!orgId,
  });

  const createAlias = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Sin organización");
      const a = alias.trim();
      const r = entityRef.trim();
      if (!a || !r) throw new Error("Completa alias y referencia");
      const { error } = await supabase.from("ai_aliases" as any).insert({
        organization_id: orgId,
        alias: a,
        entity_type: entityType,
        entity_ref: r,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAlias("");
      setEntityRef("");
      qc.invalidateQueries({ queryKey: ["ai_aliases", orgId] });
      toast.success("Alias agregado");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo agregar"),
  });

  const removeAlias = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_aliases" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_aliases", orgId] });
      toast.success("Alias eliminado");
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo eliminar"),
  });

  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <Tag className="h-5 w-5 text-primary" />
        <h2 className="display-font text-lg font-semibold">Alias del Copiloto</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Mapea jerga interna a entidades reales. Ej: "zona oscura" → caja CAJA-B2. El copiloto
        usará estos alias para resolver referencias en tus notas.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_1fr_auto] gap-2 items-end mb-5">
        <div>
          <Label htmlFor="alias-input" className="text-xs">Alias</Label>
          <Input
            id="alias-input"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="zona oscura"
            maxLength={80}
          />
        </div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ENTITY_LABELS) as EntityType[]).map((t) => (
                <SelectItem key={t} value={t}>{ENTITY_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="ref-input" className="text-xs">Referencia real</Label>
          <Input
            id="ref-input"
            value={entityRef}
            onChange={(e) => setEntityRef(e.target.value)}
            placeholder="CAJA-B2"
            maxLength={120}
          />
        </div>
        <Button
          onClick={() => createAlias.mutate()}
          disabled={createAlias.isPending || !alias.trim() || !entityRef.trim()}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90"
        >
          {createAlias.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="ml-1">Agregar</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : aliases.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border/60 rounded-lg">
          Aún no hay alias. Agrega uno para que el copiloto entienda tu jerga.
        </p>
      ) : (
        <div className="divide-y divide-border/60">
          {aliases.map((a) => (
            <div key={a.id} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Badge variant="outline" className="text-xs">{ENTITY_LABELS[a.entity_type] ?? a.entity_type}</Badge>
                <span className="font-medium text-sm truncate">"{a.alias}"</span>
                <span className="text-muted-foreground text-xs">→</span>
                <span className="text-sm truncate font-mono">{a.entity_ref}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAlias.mutate(a.id)}
                disabled={removeAlias.isPending}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_LABELS } from "@/hooks/usePlan";
import { friendlyError } from "@/lib/errors";
import type { PlanTier } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RTooltip,
} from "recharts";
import { Shield, Users, CheckCircle2, DollarSign, Gift, Search } from "lucide-react";

const PLANS: PlanTier[] = ["free", "basico", "profesional", "enterprise"];

const PLAN_BADGE: Record<PlanTier, string> = {
  free: "bg-muted text-muted-foreground",
  basico: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  profesional: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  enterprise: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

const PIE_COLORS: Record<PlanTier, string> = {
  free: "hsl(var(--muted-foreground))",
  basico: "hsl(217 91% 60%)",
  profesional: "hsl(270 91% 65%)",
  enterprise: "hsl(38 92% 50%)",
};

interface OrgRow {
  id: string;
  nombre: string;
  nombre_bioterio: string | null;
  plan: PlanTier;
  plan_expira_en: string | null;
  plan_gratis_trial: boolean;
  created_at?: string | null;
}

interface ProfileRow {
  id: string;
  organization_id: string;
  nombre: string;
  email: string | null;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: string;
}

export default function MasterPanel() {
  const { isSuperAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all" | PlanTier>("all");
  const [editing, setEditing] = useState<OrgRow | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["master-panel"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const [orgsRes, profilesRes, rolesRes] = await Promise.all([
        supabase.from("organizations").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, organization_id, nombre, email, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (orgsRes.error) throw orgsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      return {
        orgs: (orgsRes.data ?? []) as OrgRow[],
        profiles: (profilesRes.data ?? []) as ProfileRow[],
        roles: (rolesRes.data ?? []) as RoleRow[],
      };
    },
  });

  const orgs = data?.orgs ?? [];
  const profiles = data?.profiles ?? [];

  // Group profiles per org
  const profilesByOrg = useMemo(() => {
    const m = new Map<string, ProfileRow[]>();
    for (const p of profiles) {
      const arr = m.get(p.organization_id) ?? [];
      arr.push(p);
      m.set(p.organization_id, arr);
    }
    return m;
  }, [profiles]);

  // Stats
  const stats = useMemo(() => {
    const total = orgs.length;
    const totalUsers = profiles.length;
    const paid = orgs.filter((o) => o.plan !== "free").length;
    const free = orgs.filter((o) => o.plan === "free").length;
    const trial = orgs.filter((o) => o.plan_gratis_trial).length;
    return { total, totalUsers, paid, free, trial };
  }, [orgs, profiles]);

  const planDistribution = useMemo(
    () =>
      PLANS.map((p) => ({
        plan: p,
        label: PLAN_LABELS[p],
        value: orgs.filter((o) => o.plan === p).length,
      })).filter((d) => d.value > 0),
    [orgs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orgs.filter((o) => {
      if (filterPlan !== "all" && o.plan !== filterPlan) return false;
      if (!q) return true;
      const profs = profilesByOrg.get(o.id) ?? [];
      const haystack = [
        o.nombre,
        o.nombre_bioterio ?? "",
        ...profs.map((p) => `${p.nombre} ${p.email ?? ""}`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [orgs, search, filterPlan, profilesByOrg]);

  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="display-font text-2xl font-bold">Panel Maestro</h1>
          <p className="text-sm text-muted-foreground">
            Súper administración global · BioTrack Central
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Organizaciones" value={stats.total} />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          label="Usuarios totales"
          value={stats.totalUsers}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4 text-amber-500" />}
          label="Plan de pago"
          value={stats.paid}
        />
        <StatCard
          icon={<Gift className="h-4 w-4 text-blue-500" />}
          label="Trials gratuitos"
          value={stats.trial}
        />
      </div>

      {/* Distribución */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribución de planes</CardTitle>
        </CardHeader>
        <CardContent>
          {planDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin organizaciones registradas.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {planDistribution.map((d) => (
                        <Cell key={d.plan} fill={PIE_COLORS[d.plan]} />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {planDistribution.map((d) => {
                  const pct = ((d.value / stats.total) * 100).toFixed(0);
                  return (
                    <div key={d.plan} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-sm"
                          style={{ background: PIE_COLORS[d.plan] }}
                        />
                        <span>{d.label}</span>
                      </div>
                      <span className="font-medium tabular-nums">
                        {d.value} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Organizaciones</CardTitle>
            <p className="text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar bioterio o usuario…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-full sm:w-72"
              />
            </div>
            <Select value={filterPlan} onValueChange={(v) => setFilterPlan(v as any)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los planes</SelectItem>
                {PLANS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PLAN_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin organizaciones.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bioterio</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Usuarios</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const profs = profilesByOrg.get(o.id) ?? [];
                  const principal = profs[0];
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="font-medium">{o.nombre_bioterio || o.nombre}</div>
                        {o.nombre_bioterio && o.nombre_bioterio !== o.nombre && (
                          <div className="text-xs text-muted-foreground">{o.nombre}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {principal ? (
                          <div>
                            <div className="text-sm">{principal.nombre}</div>
                            <div className="text-xs text-muted-foreground">
                              {principal.email ?? "—"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">{profs.length}</TableCell>
                      <TableCell>
                        <Badge className={PLAN_BADGE[o.plan]} variant="secondary">
                          {o.plan === "enterprise" && "⭐ "}
                          {PLAN_LABELS[o.plan].toUpperCase()}
                        </Badge>
                        {o.plan_gratis_trial && (
                          <span className="ml-2 text-xs text-blue-500">trial</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {o.created_at
                          ? new Date(o.created_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditing(o)}>
                          Gestionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ManageOrgDialog
        org={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["master-panel"] });
          refetch();
        }}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
          {icon}
        </div>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function ManageOrgDialog({
  org,
  onClose,
  onSaved,
}: {
  org: OrgRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [nombreBioterio, setNombreBioterio] = useState("");
  const [plan, setPlan] = useState<PlanTier>("free");
  const [esTrial, setEsTrial] = useState(false);
  const [expira, setExpira] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset on open
  useMemo(() => {
    if (org) {
      setNombreBioterio(org.nombre_bioterio ?? "");
      setPlan(org.plan);
      setEsTrial(org.plan_gratis_trial);
      setExpira(org.plan_expira_en ?? "");
      setMotivo("");
    }
  }, [org]);

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    try {
      const planChanged = plan !== org.plan;

      const { error } = await supabase
        .from("organizations")
        .update({
          nombre_bioterio: nombreBioterio || null,
          plan,
          plan_gratis_trial: esTrial,
          plan_expira_en: expira || null,
        })
        .eq("id", org.id);
      if (error) throw error;

      if (planChanged) {
        await supabase.from("plan_historial").insert({
          organization_id: org.id,
          plan_anterior: org.plan,
          plan_nuevo: plan,
          motivo: motivo || (esTrial ? "trial" : "cambio_admin"),
          cambiado_por: user?.id ?? null,
        });
      }

      toast.success("Organización actualizada");
      onSaved();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!org} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {org && (
          <>
            <DialogHeader>
              <DialogTitle>Gestionar organización</DialogTitle>
              <DialogDescription>
                {org.nombre} · creada{" "}
                {org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nb">Nombre del bioterio</Label>
                <Input
                  id="nb"
                  value={nombreBioterio}
                  onChange={(e) => setNombreBioterio(e.target.value)}
                  placeholder="Ej. Bioterio UNAM"
                />
              </div>

              <div className="space-y-2">
                <Label>Plan</Label>
                <RadioGroup value={plan} onValueChange={(v) => setPlan(v as PlanTier)}>
                  <div className="grid grid-cols-2 gap-2">
                    {PLANS.map((p) => (
                      <label
                        key={p}
                        className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-accent"
                      >
                        <RadioGroupItem value={p} id={`plan-${p}`} />
                        <span className="text-sm font-medium">{PLAN_LABELS[p]}</span>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="trial"
                  checked={esTrial}
                  onCheckedChange={(c) => setEsTrial(!!c)}
                />
                <div>
                  <Label htmlFor="trial" className="cursor-pointer">
                    Es upgrade gratuito (trial manual)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Marcar si el usuario no está pagando este plan.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp">Fecha de expiración (opcional)</Label>
                <Input
                  id="exp"
                  type="date"
                  value={expira}
                  onChange={(e) => setExpira(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Vacío = no expira.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mot">Motivo del cambio</Label>
                <Textarea
                  id="mot"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej. Regalo para beta testing"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

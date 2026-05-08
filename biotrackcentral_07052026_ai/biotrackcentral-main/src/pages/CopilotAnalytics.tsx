import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, AlertTriangle, XCircle, CheckCircle2, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CopilotAnalytics() {
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ["ai_telemetry_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_telemetry_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: journals, isLoading: loadingJournals } = useQuery({
    queryKey: ["ai_journal_runs_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_journal_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (loadingEvents || loadingJournals) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const parseSuccess = events?.filter(e => e.event_type === "parse_success").length || 0;
  const clarificationReq = events?.filter(e => e.event_type === "clarification_triggered").length || 0;
  const semanticFailures = events?.filter(e => e.event_type === "semantic_failure").length || 0;
  const execConfirmed = events?.filter(e => e.event_type === "execution_confirmed").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight display-font bg-gradient-primary text-transparent bg-clip-text inline-block">
          Telemetría y Analíticas IA
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitoriza el rendimiento del copiloto semántico, identifica cuellos de botella y descubre nuevos alias para mejorar la experiencia. (Últimos 30 días)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parseo Exitoso</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parseSuccess}</div>
            <p className="text-xs text-muted-foreground">Operaciones entendidas a la primera</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aclaraciones Pedidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clarificationReq}</div>
            <p className="text-xs text-muted-foreground">Intervenciones del radar de ambigüedad</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fallos Semánticos</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{semanticFailures}</div>
            <p className="text-xs text-muted-foreground">Intenciones no soportadas o vacías</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ejecuciones</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{execConfirmed}</div>
            <p className="text-xs text-muted-foreground">Lotes confirmados por humanos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Sugerencias de Alias (Motor de Aprendizaje)</CardTitle>
            <CardDescription>Entidades que la IA falló en resolver recientemente.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Término Ambigüo</TableHead>
                    <TableHead>Razón</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events?.filter(e => e.event_type === "clarification_triggered").map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-amber-600">
                        {String((e.metadata as any)?.ambiguous_references?.[0] || "Desconocido")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {String((e.metadata as any)?.razon || "")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {events?.filter(e => e.event_type === "clarification_triggered").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-4">No hay referencias ambiguas recientes.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Prompt Replay (Herramienta de Auditoría)</CardTitle>
            <CardDescription>Revisa qué escribieron los operadores y qué ejecutaron.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prompt Original</TableHead>
                    <TableHead>Operaciones</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journals?.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={j.note}>
                        "{j.note}"
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{(j.operations as any[])?.length || 0} validas</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(j.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {journals?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No hay ejecuciones recientes.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

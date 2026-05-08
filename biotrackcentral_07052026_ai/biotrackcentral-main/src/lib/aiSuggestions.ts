import type { Database } from "@/integrations/supabase/types";

type Caja = Database["public"]["Tables"]["cajas"]["Row"];
type Lote = Database["public"]["Tables"]["lotes"]["Row"];

export type SuggestionSeverity = "high" | "medium" | "low";
export type SuggestionCategory = "biological" | "workflow" | "capacity" | "maintenance";

export interface AISuggestion {
  id: string;
  category: SuggestionCategory;
  severity: SuggestionSeverity;
  title: string;
  description: string;
  syntheticPrompt: string;
  // Metadata for telemetry/UI
  entityId: string;
  entityType: "lote" | "caja";
}

interface OrgSettings {
  maxAnimalsPerCaja?: number;
}

export function generateOperationalSuggestions(
  cajas: Caja[],
  lotes: Lote[],
  settings?: OrgSettings
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const maxPerCaja = settings?.maxAnimalsPerCaja ?? 15;

  const activeLotes = lotes.filter((l) => l.estado === "activo");

  // 1. Biological Risk: Weaning (Destete)
  // Lotes older than 21 days
  const twentyOneDaysAgo = new Date();
  twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

  for (const lote of activeLotes) {
    if (!lote.fecha_nacimiento) continue;
    const birthDate = new Date(lote.fecha_nacimiento);
    if (birthDate <= twentyOneDaysAgo && lote.tipo === "nacimiento") {
      const caja = cajas.find((c) => c.id === lote.caja_id);
      const cajaCode = caja?.codigo || "desconocida";
      const loteName = lote.codigo || lote.id.slice(0, 6);
      
      const diffTime = Math.abs(Date.now() - birthDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      suggestions.push({
        id: `wean_${lote.id}`,
        category: "biological",
        severity: "high",
        title: "Destete Pendiente",
        description: `El lote ${loteName} en la caja ${cajaCode} tiene ${diffDays} días de edad. Es momento de separarlos.`,
        syntheticPrompt: `Separar por sexo el lote ${loteName} de la caja ${cajaCode}`,
        entityId: lote.id,
        entityType: "lote",
      });
    }
  }

  // 2. Capacity/Overpopulation
  const lotesByCaja = new Map<string, Lote[]>();
  for (const lote of activeLotes) {
    if (!lote.caja_id) continue;
    if (!lotesByCaja.has(lote.caja_id)) lotesByCaja.set(lote.caja_id, []);
    lotesByCaja.get(lote.caja_id)!.push(lote);
  }

  for (const caja of cajas) {
    const lotesInCaja = lotesByCaja.get(caja.id) || [];
    const totalAnimals = lotesInCaja.reduce((sum, l) => sum + (l.cantidad_actual || 0), 0);
    
    // Si la caja tiene capacidad definida, usa esa, sino usa el threshold global
    const limit = caja.capacidad || maxPerCaja;

    if (totalAnimals > limit && limit > 0) {
      suggestions.push({
        id: `overpop_${caja.id}`,
        category: "capacity",
        severity: "medium",
        title: "Caja Sobrepoblada",
        description: `La caja ${caja.codigo} tiene ${totalAnimals} individuos (límite sugerido: ${limit}).`,
        syntheticPrompt: `Trasladar ${totalAnimals - limit} animales de la caja ${caja.codigo} a otra caja vacía`,
        entityId: caja.id,
        entityType: "caja",
      });
    }
  }

  // 3. Workflow Incompleteness
  // Lotes without lineage
  for (const lote of activeLotes) {
    if (!lote.linea_genetica_id) {
      const caja = cajas.find((c) => c.id === lote.caja_id);
      const cajaCode = caja?.codigo || "desconocida";
      const loteName = lote.codigo || lote.id.slice(0, 6);

      suggestions.push({
        id: `nolineage_${lote.id}`,
        category: "workflow",
        severity: "low",
        title: "Línea Genética Faltante",
        description: `El lote ${loteName} en la caja ${cajaCode} no tiene línea genética asignada.`,
        syntheticPrompt: `Asignar línea genética al lote ${loteName}`,
        entityId: lote.id,
        entityType: "lote",
      });
    }
  }

  // Sort by severity: high > medium > low
  const severityScore = { high: 3, medium: 2, low: 1 };
  suggestions.sort((a, b) => severityScore[b.severity] - severityScore[a.severity]);

  return suggestions;
}

// System prompt + compact org context for the LLM (multi-operation extractor).

import { ESPECIES, INTENT_NAMES } from "./schemas.ts";

export interface OrgContext {
  lotes: { codigo: string; especie: string; cantidad: number }[];
  cajas: { codigo: string; uso: string }[];
  lineas: { nombre: string; especie: string }[];
  clientes: { nombre: string }[];
  aliases: { alias: string; type: string; ref: string }[];
  recent_history: string[];
}

export function buildSystemPrompt(ctx: OrgContext): string {
  const loteList = ctx.lotes.slice(0, 60).map((l) => `${l.codigo} (${l.especie}, ${l.cantidad})`).join(", ") || "—";
  const cajaList = ctx.cajas.slice(0, 80).map((c) => c.codigo).join(", ") || "—";
  const lineaList = ctx.lineas.slice(0, 40).map((l) => l.nombre).join(", ") || "—";
  const clienteList = ctx.clientes.slice(0, 40).map((c) => c.nombre).join(", ") || "—";
  const aliasList = ctx.aliases.map((a) => `"${a.alias}" -> ${a.type} ${a.ref}`).join("; ") || "—";
  const historyList = ctx.recent_history.map((h, i) => `${i+1}. ${h}`).join("\n") || "Sin historial reciente.";

  return `Eres BioTrack Copilot, un extractor operativo semántico para un bioterio.

Tu función es leer una nota operativa en lenguaje natural y devolver UNA llamada a la herramienta \`registrar_operaciones\` con un array \`operations\`.

Intenciones válidas: ${INTENT_NAMES.join(", ")}.
Especies válidas: ${ESPECIES.join(", ")}.

Contexto de la organización:
- Lotes activos: ${loteList}
- Cajas: ${cajaList}
- Líneas genéticas: ${lineaList}
- Clientes: ${clienteList}
- Alias Semánticos (Usa estos para resolver jerga): ${aliasList}

Historial Operativo Reciente (solo como contexto para entender referencias, NO repitas estas operaciones):
${historyList}

Reglas estrictas de Extracción:
- Cada operación DEBE tener un \`id\` tipo "tmp-1", "tmp-2"...
- Si el usuario usa alias semánticos, resuélvelos usando el "Contexto de la organización".
- Debes incluir el campo \`explanation\` obligatoriamente explicando qué entendiste (\`understood\`), las entidades que resolviste (\`entities_resolved\`) y qué asumiste (\`assumptions_made\`).

Reglas estrictas de Clarificación (requires_clarification):
NUNCA adivines. Si ocurre CUALQUIERA de lo siguiente, debes emitir la intención \`requires_clarification\` para esa operación, detallando la \`razon\`:
1. Faltan datos obligatorios (ej. dice "moví 5 ratones" pero no dice a qué caja). (Anota en \`missing_fields\`).
2. Las referencias a entidades son ambiguas (ej. hay varios lotes parecidos o cajas similares). (Anota en \`ambiguous_references\`).
3. La operación parece contradecirse (ej. pide trasladar más animales de los que tiene el lote).
4. La interpretación semántica es insegura.
(En \`requires_clarification\` usa el campo \`suggestions\` para sugerir correcciones, ej. "¿Te referías a la caja B2?").

- "confidence" es solo una pista UX. Las operaciones dudosas deben ir como requires_clarification.
- Mínimo 1 operación, máximo 20.`;
}

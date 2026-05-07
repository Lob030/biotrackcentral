// System prompt + compact org context for the LLM (multi-operation extractor).

import { ESPECIES, INTENT_NAMES } from "./schemas.ts";

export interface OrgContext {
  lotes: { codigo: string; especie: string; cantidad: number }[];
  cajas: { codigo: string; uso: string }[];
  lineas: { nombre: string; especie: string }[];
}

export function buildSystemPrompt(ctx: OrgContext): string {
  const loteList = ctx.lotes.slice(0, 60).map((l) => `${l.codigo} (${l.especie}, ${l.cantidad})`).join(", ") || "—";
  const cajaList = ctx.cajas.slice(0, 80).map((c) => c.codigo).join(", ") || "—";
  const lineaList = ctx.lineas.slice(0, 40).map((l) => l.nombre).join(", ") || "—";

  return `Eres BioTrack Copilot, un extractor operativo para un bioterio.

Tu única función es leer una nota operativa en lenguaje natural (puede contener VARIAS acciones) y devolver UNA sola llamada a la herramienta \`registrar_operaciones\` con un array \`operations\` que contenga cada acción detectada como un elemento independiente.

Intenciones válidas: ${INTENT_NAMES.join(", ")}.
Especies válidas: ${ESPECIES.join(", ")}.

Contexto de la organización (no inventes nada fuera de esto):
- Lotes activos: ${loteList}
- Cajas: ${cajaList}
- Líneas genéticas: ${lineaList}

Reglas estrictas:
- SIEMPRE devuelve un único tool call \`registrar_operaciones\`.
- Cada operación DEBE ser un objeto JSON real (NO un string con JSON dentro, NO un array).
- Cada operación DEBE usar la clave \`payload\` para los datos. NUNCA uses \`data\`, \`args\`, \`params\` u otras variantes.
- Cada operación debe tener un \`id\` único tipo "tmp-1", "tmp-2", … en orden de aparición.
- NUNCA mezcles dos acciones distintas en una sola operación. Sepáralas.
- Conserva el orden en que aparecen en el texto.
- "confidence" entre 0 y 1; usa < 0.6 si la frase es ambigua o falta información.
- Si una frase es ambigua, INCLÚYELA con baja confianza en lugar de adivinar valores peligrosos.
- "source_text" debe ser el fragmento literal de la nota que originó la operación (máx ~200 chars).
- Para referencias usa el código exacto que ves en el contexto. No inventes códigos.
- Fechas en formato YYYY-MM-DD. "hoy" = la fecha de hoy proporcionada.
- "registrar_mortalidad" requiere lote o caja + cantidad.
- "dividir_lote" requiere lote_origen + lista de movimientos {sexo?, cantidad, caja}.
- Para nacimientos en una caja existente, usa intent "crear_lote" con esa caja como destino y \`cantidad_inicial\`.
- Si el usuario pide algo fuera de las intenciones soportadas, omite esa parte. NO inventes intenciones.
- Mínimo 1 operación, máximo 20.`;
}

// Strict zod schemas for AI Operational Copilot intents.
// The LLM MUST produce one of these. Anything else is rejected.

import { z } from "npm:zod@3.23.8";

export const ESPECIES = ["ASF", "Raton", "Rata"] as const;
export const SEXOS = ["macho", "hembra", "mixto"] as const;
export const CAJA_USOS = ["reproductor", "engorda"] as const;
export const CAJA_ESTADOS = ["libre", "ocupada", "limpieza"] as const;
export const LOTE_ESTADOS = ["activo", "dividido", "finalizado"] as const;
export const LOTE_TIPOS = ["nacimiento", "engorda", "reproduccion"] as const;

const refStr = z.string().trim().min(1).max(120);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const crearLineaSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  especie: z.enum(ESPECIES),
  origen: z.string().trim().max(200).optional(),
  color_etiqueta: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const editarLineaSchema = z.object({
  ref: refStr,
  cambios: z.object({
    nombre: z.string().trim().min(1).max(120).optional(),
    origen: z.string().trim().max(200).optional(),
    color_etiqueta: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }).refine((c) => Object.keys(c).length > 0, "Sin cambios"),
});

export const crearCajaSchema = z.object({
  codigos: z.array(z.string().trim().min(1).max(40)).min(1).max(50),
  ubicacion: z.string().trim().max(120).optional(),
  capacidad: z.number().int().positive().max(10_000).optional(),
  uso: z.enum(CAJA_USOS),
});

export const editarCajaSchema = z.object({
  ref: refStr,
  cambios: z.object({
    ubicacion: z.string().trim().max(120).optional(),
    capacidad: z.number().int().positive().max(10_000).optional(),
    estado: z.enum(CAJA_ESTADOS).optional(),
  }).refine((c) => Object.keys(c).length > 0, "Sin cambios"),
});

export const crearLoteSchema = z.object({
  codigo: z.string().trim().min(1).max(80),
  especie: z.enum(ESPECIES),
  fecha_nacimiento: isoDate,
  linea_genetica: refStr.optional(),
  tipo: z.enum(LOTE_TIPOS).optional(),
  cantidad_inicial: z.number().int().nonnegative().max(100_000).optional(),
  machos: z.number().int().nonnegative().max(100_000).optional(),
  hembras: z.number().int().nonnegative().max(100_000).optional(),
  caja: refStr.optional(),
  notas: z.string().trim().max(500).optional(),
});

export const editarLoteSchema = z.object({
  ref: refStr,
  cambios: z.object({
    codigo: z.string().trim().min(1).max(80).optional(),
    estado: z.enum(LOTE_ESTADOS).optional(),
    notas: z.string().trim().max(500).optional(),
    caja: refStr.optional(),
  }).refine((c) => Object.keys(c).length > 0, "Sin cambios"),
});

export const mortalidadSchema = z.object({
  lote: refStr.optional(),
  caja: refStr.optional(),
  cantidad: z.number().int().positive().max(100_000),
  sexo: z.enum(SEXOS).optional(),
  fecha: isoDate.optional(),
  notas: z.string().trim().max(500).optional(),
}).refine((p) => p.lote || p.caja, "Indica lote o caja");

export const trasladoSchema = z.object({
  lote_origen: refStr,
  caja_destino: refStr,
  cantidad: z.number().int().positive().max(100_000).optional(),
  sexo: z.enum(SEXOS).optional(),
  fecha: isoDate.optional(),
  notas: z.string().trim().max(500).optional(),
});

export const dividirLoteSchema = z.object({
  lote_origen: refStr,
  fecha: isoDate.optional(),
  movimientos: z.array(z.object({
    sexo: z.enum(SEXOS).optional(),
    cantidad: z.number().int().positive().max(100_000),
    caja: refStr,
    codigo_nuevo: z.string().trim().max(80).optional(),
  })).min(1).max(20),
});

export const CLIENTE_TIPOS = ["general", "laboratorio", "centro_investigacion", "veterinario"] as const;
export const CLIENTE_ESTADOS = ["activo", "inactivo", "bloqueado"] as const;
export const PEDIDO_ESTADOS = ["pendiente", "confirmado", "en_preparacion", "listo", "entregado", "cancelado"] as const;

export const crearClienteSchema = z.object({
  nombre: z.string().trim().min(1).max(160),
  contacto_principal: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(160).optional(),
  telefono: z.string().trim().max(40).optional(),
  tipo_cliente: z.enum(CLIENTE_TIPOS).optional(),
  ciudad: z.string().trim().max(120).optional(),
  notas: z.string().trim().max(500).optional(),
});

export const editarClienteSchema = z.object({
  ref: refStr,
  cambios: z.object({
    nombre: z.string().trim().min(1).max(160).optional(),
    contacto_principal: z.string().trim().max(160).optional(),
    email: z.string().trim().email().max(160).optional(),
    telefono: z.string().trim().max(40).optional(),
    tipo_cliente: z.enum(CLIENTE_TIPOS).optional(),
    estado_cliente: z.enum(CLIENTE_ESTADOS).optional(),
    ciudad: z.string().trim().max(120).optional(),
    notas: z.string().trim().max(500).optional(),
  }).refine((c) => Object.keys(c).length > 0, "Sin cambios"),
});

const pedidoLineaSchema = z.object({
  especie: z.enum(ESPECIES),
  etapa: z.string().trim().min(1).max(60),
  cantidad: z.number().int().positive().max(100_000),
  precio_unitario: z.number().nonnegative().max(10_000_000).optional(),
});

export const crearPedidoSchema = z.object({
  cliente: refStr,
  fecha_pedido: isoDate.optional(),
  fecha_entrega_solicitada: isoDate.optional(),
  porcentaje_descuento: z.number().min(0).max(100).optional(),
  notas: z.string().trim().max(500).optional(),
  lineas: z.array(pedidoLineaSchema).min(1).max(20),
});

export const editarPedidoSchema = z.object({
  ref: refStr, // numero_pedido
  cambios: z.object({
    estado: z.enum(PEDIDO_ESTADOS).optional(),
    fecha_entrega_solicitada: isoDate.optional(),
    fecha_entrega_realizada: isoDate.optional(),
    notas: z.string().trim().max(500).optional(),
  }).refine((c) => Object.keys(c).length > 0, "Sin cambios"),
});

export const clarificationSchema = z.object({
  razon: z.string().trim().max(300),
  missing_fields: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
  ambiguous_references: z.array(z.string()).optional(),
});

export const INTENT_NAMES = [
  "crear_linea_genetica",
  "editar_linea_genetica",
  "crear_caja",
  "editar_caja",
  "crear_lote",
  "editar_lote",
  "registrar_mortalidad",
  "trasladar_animales",
  "dividir_lote",
  "requires_clarification",
] as const;
export type IntentName = (typeof INTENT_NAMES)[number];

export const PAYLOAD_SCHEMAS = {
  crear_linea_genetica: crearLineaSchema,
  editar_linea_genetica: editarLineaSchema,
  crear_caja: crearCajaSchema,
  editar_caja: editarCajaSchema,
  crear_lote: crearLoteSchema,
  editar_lote: editarLoteSchema,
  registrar_mortalidad: mortalidadSchema,
  trasladar_animales: trasladoSchema,
  dividir_lote: dividirLoteSchema,
  requires_clarification: clarificationSchema,
} as const;

export const intentEnvelopeSchema = z.object({
  intent: z.enum(INTENT_NAMES),
  confidence: z.number().min(0).max(1).default(0.5),
  payload: z.record(z.unknown()),
});

export function validateIntent(raw: unknown) {
  const env = intentEnvelopeSchema.parse(raw);
  const schema = PAYLOAD_SCHEMAS[env.intent];
  const payload = schema.parse(env.payload);
  return { intent: env.intent, confidence: env.confidence, payload };
}

// ───────────── Multi-operation (batch) schemas ─────────────

export const explanationSchema = z.object({
  understood: z.string(),
  entities_resolved: z.array(z.string()).optional(),
  assumptions_made: z.array(z.string()).optional(),
});

export const operationEnvelopeSchema = z.object({
  id: z.string().trim().min(1).max(40),
  intent: z.enum(INTENT_NAMES),
  confidence: z.number().min(0).max(1).default(0.5),
  payload: z.record(z.unknown()),
  source_text: z.string().max(800).optional(),
  explanation: explanationSchema.optional(),
});

export const batchEnvelopeSchema = z.object({
  operations: z.array(operationEnvelopeSchema).min(1).max(20),
});

export interface ValidOperation {
  id: string;
  intent: IntentName;
  confidence: number;
  payload: Record<string, unknown>;
  source_text?: string;
  requires_confirmation: true;
}
export interface InvalidOperation {
  id: string;
  intent?: string;
  error: string;
  raw: unknown;
  source_text?: string;
}

export function validateOperation(raw: unknown):
  | { ok: true; op: ValidOperation }
  | { ok: false; bad: InvalidOperation } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      ok: false,
      bad: {
        id: "tmp-?",
        error: `Operación no es un objeto (tipo recibido: ${Array.isArray(raw) ? "array" : typeof raw}).`,
        raw,
      },
    };
  }
  const envParsed = operationEnvelopeSchema.safeParse(raw);
  if (!envParsed.success) {
    const r = raw as any;
    return {
      ok: false,
      bad: {
        id: r?.id ?? "tmp-?",
        intent: r?.intent,
        error: envParsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        raw,
        source_text: r?.source_text,
      },
    };
  }
  const env = envParsed.data;
  const schema = PAYLOAD_SCHEMAS[env.intent];
  const payloadParsed = schema.safeParse(env.payload);
  if (!payloadParsed.success) {
    return {
      ok: false,
      bad: {
        id: env.id,
        intent: env.intent,
        error: payloadParsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        raw,
        source_text: env.source_text,
      },
    };
  }
  return {
    ok: true,
    op: {
      id: env.id,
      intent: env.intent,
      confidence: env.confidence,
      payload: payloadParsed.data as Record<string, unknown>,
      source_text: env.source_text,
      requires_confirmation: true,
    },
  };
}

export type ValidatedIntent =
  | { intent: "crear_linea_genetica"; confidence: number; payload: z.infer<typeof crearLineaSchema> }
  | { intent: "editar_linea_genetica"; confidence: number; payload: z.infer<typeof editarLineaSchema> }
  | { intent: "crear_caja"; confidence: number; payload: z.infer<typeof crearCajaSchema> }
  | { intent: "editar_caja"; confidence: number; payload: z.infer<typeof editarCajaSchema> }
  | { intent: "crear_lote"; confidence: number; payload: z.infer<typeof crearLoteSchema> }
  | { intent: "editar_lote"; confidence: number; payload: z.infer<typeof editarLoteSchema> }
  | { intent: "registrar_mortalidad"; confidence: number; payload: z.infer<typeof mortalidadSchema> }
  | { intent: "trasladar_animales"; confidence: number; payload: z.infer<typeof trasladoSchema> }
  | { intent: "dividir_lote"; confidence: number; payload: z.infer<typeof dividirLoteSchema> }
  | { intent: "requires_clarification"; confidence: number; payload: z.infer<typeof clarificationSchema> };

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

export type ValidatedIntent =
  | { intent: "crear_linea_genetica"; confidence: number; payload: z.infer<typeof crearLineaSchema> }
  | { intent: "editar_linea_genetica"; confidence: number; payload: z.infer<typeof editarLineaSchema> }
  | { intent: "crear_caja"; confidence: number; payload: z.infer<typeof crearCajaSchema> }
  | { intent: "editar_caja"; confidence: number; payload: z.infer<typeof editarCajaSchema> }
  | { intent: "crear_lote"; confidence: number; payload: z.infer<typeof crearLoteSchema> }
  | { intent: "editar_lote"; confidence: number; payload: z.infer<typeof editarLoteSchema> }
  | { intent: "registrar_mortalidad"; confidence: number; payload: z.infer<typeof mortalidadSchema> }
  | { intent: "trasladar_animales"; confidence: number; payload: z.infer<typeof trasladoSchema> }
  | { intent: "dividir_lote"; confidence: number; payload: z.infer<typeof dividirLoteSchema> };

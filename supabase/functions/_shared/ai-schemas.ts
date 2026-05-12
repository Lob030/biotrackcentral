// Shared schemas + intent registry for the AI agent edge functions.
// Mirrored on the frontend at src/lib/ai/schemas.ts.
import { z } from "npm:zod@3.23.8";

export const ESPECIES = ["ASF", "Raton", "Rata"] as const;
export const SEXOS = ["macho", "hembra", "mixto"] as const;
export const CAJA_USOS = ["reproductor", "engorda"] as const;
export const CAJA_ESTADOS = ["libre", "ocupada", "limpieza"] as const;
export const LOTE_ESTADOS = ["activo", "dividido", "finalizado"] as const;
export const LOTE_TIPOS = ["nacimiento", "engorda", "reproduccion"] as const;
export const CLIENTE_TIPOS = ["general", "laboratorio", "centro_investigacion", "veterinario"] as const;

const refStr = z.string().trim().min(1).max(120);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const IntentSchemas = {
  crear_linea_genetica: z.object({
    nombre: z.string().trim().min(1).max(120),
    especie: z.enum(ESPECIES),
    origen: z.string().trim().max(200).optional(),
    color_etiqueta: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
  editar_linea_genetica: z.object({
    ref: refStr,
    cambios: z.object({
      nombre: z.string().trim().min(1).max(120).optional(),
      origen: z.string().trim().max(200).optional(),
      color_etiqueta: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }).refine((c) => Object.keys(c).length > 0),
  }),
  crear_caja: z.object({
    codigos: z.array(z.string().trim().min(1).max(40)).min(1).max(50),
    ubicacion: z.string().trim().max(120).optional(),
    capacidad: z.number().int().positive().max(10_000).optional(),
    uso: z.enum(CAJA_USOS),
  }),
  editar_caja: z.object({
    ref: refStr,
    cambios: z.object({
      ubicacion: z.string().trim().max(120).optional(),
      capacidad: z.number().int().positive().max(10_000).optional(),
      estado: z.enum(CAJA_ESTADOS).optional(),
    }).refine((c) => Object.keys(c).length > 0),
  }),
  crear_lote: z.object({
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
  }),
  editar_lote: z.object({
    ref: refStr,
    cambios: z.object({
      codigo: z.string().trim().min(1).max(80).optional(),
      estado: z.enum(LOTE_ESTADOS).optional(),
      notas: z.string().trim().max(500).optional(),
      caja: refStr.optional(),
    }).refine((c) => Object.keys(c).length > 0),
  }),
  registrar_mortalidad: z.object({
    lote: refStr.optional(),
    caja: refStr.optional(),
    cantidad: z.number().int().positive().max(100_000),
    sexo: z.enum(SEXOS).optional(),
    fecha: isoDate.optional(),
    notas: z.string().trim().max(500).optional(),
  }).refine((p) => p.lote || p.caja),
  trasladar_animales: z.object({
    lote_origen: refStr,
    caja_destino: refStr,
    cantidad: z.number().int().positive().max(100_000).optional(),
    sexo: z.enum(SEXOS).optional(),
    fecha: isoDate.optional(),
    notas: z.string().trim().max(500).optional(),
  }),
  dividir_lote: z.object({
    lote_origen: refStr,
    fecha: isoDate.optional(),
    movimientos: z.array(z.object({
      sexo: z.enum(SEXOS).optional(),
      cantidad: z.number().int().positive().max(100_000),
      caja: refStr,
      codigo_nuevo: z.string().trim().max(80).optional(),
    })).min(1).max(20),
  }),
  crear_cliente: z.object({
    nombre: z.string().trim().min(1).max(200),
    tipo_cliente: z.enum(CLIENTE_TIPOS).optional(),
    email: z.string().trim().email().optional(),
    telefono: z.string().trim().max(40).optional(),
    ciudad: z.string().trim().max(120).optional(),
    notas: z.string().trim().max(500).optional(),
  }),
  crear_pedido: z.object({
    cliente: refStr,
    fecha_entrega_solicitada: isoDate.optional(),
    items: z.array(z.object({
      especie: z.enum(ESPECIES),
      etapa: z.string().trim().min(1).max(60),
      cantidad: z.number().int().positive().max(100_000),
      precio_unitario: z.number().nonnegative().max(1_000_000),
    })).min(1).max(50),
    notas: z.string().trim().max(500).optional(),
  }),
} as const;

export type IntentName = keyof typeof IntentSchemas;
export const ALL_INTENTS = Object.keys(IntentSchemas) as IntentName[];

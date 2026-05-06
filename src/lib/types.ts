/**
 * Shared domain types derived from the auto-generated Supabase schema.
 *
 * Prefer importing entity row types from here instead of redeclaring
 * `interface Lote { … }` per page. The base `Database` type is regenerated
 * by Supabase, so columns stay in sync automatically.
 *
 * Add new aliases here as we migrate pages off ad-hoc interfaces.
 */
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

// Row types
export type LoteRow = Tables["lotes"]["Row"];
export type CajaRow = Tables["cajas"]["Row"];
export type ClienteRow = Tables["clientes"]["Row"];
export type PedidoRow = Tables["pedidos"]["Row"];
export type PedidoDetalleRow = Tables["pedidos_detalles"]["Row"];
export type GastoRow = Tables["gastos"]["Row"];
export type LineaGeneticaRow = Tables["lineas_geneticas"]["Row"];
export type LoteEventoRow = Tables["lote_eventos"]["Row"];
export type AlertaPersonalizadaRow = Tables["alertas_personalizadas"]["Row"];
export type AlertaSistemaConfigRow = Tables["alertas_sistema_config"]["Row"];
export type OrganizationRow = Tables["organizations"]["Row"];
export type ProfileRow = Tables["profiles"]["Row"];

// Insert / Update helpers
export type LoteInsert = Tables["lotes"]["Insert"];
export type LoteUpdate = Tables["lotes"]["Update"];
export type GastoInsert = Tables["gastos"]["Insert"];
export type ClienteInsert = Tables["clientes"]["Insert"];
export type PedidoInsert = Tables["pedidos"]["Insert"];

// Common enums
export type EspecieEnum = Enums["especie"];
export type LoteEstadoEnum = Enums["lote_estado"];
export type LoteTipoEnum = Enums["lote_tipo"];
export type CajaEstadoEnum = Enums["caja_estado"];
export type ClienteEstadoEnum = Enums["cliente_estado"];
export type ClienteTipoEnum = Enums["cliente_tipo"];
export type PedidoEstadoEnum = Enums["pedido_estado"];

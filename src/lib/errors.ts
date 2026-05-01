// Maps raw Supabase / Postgres errors to friendly user-facing messages
// so we don't leak constraint names or internal schema details to end users.

export function friendlyError(e: unknown, fallback = "Ocurrió un error. Inténtalo de nuevo."): string {
  const msg = (e as any)?.message ?? "";
  const code = (e as any)?.code ?? "";

  if (typeof msg === "string") {
    // Known unique constraints
    if (msg.includes("unique_cliente_org")) return "Ya existe un cliente con ese nombre.";
    if (msg.includes("unique_pedido_numero")) return "Ese número de pedido ya existe.";
    if (msg.includes("unique_caja_codigo")) return "Ya existe una caja con ese código.";
    if (msg.includes("unique_lote_codigo")) return "Ya existe un lote con ese código.";

    // Generic Postgres error classes — return a category, not the raw text
    if (code === "23505") return "Ese registro ya existe.";
    if (code === "23503") return "No se puede completar: hay datos relacionados.";
    if (code === "23502") return "Falta completar un campo obligatorio.";
    if (code === "23514") return "Algún valor no cumple con las reglas permitidas.";
    if (code === "42501" || msg.toLowerCase().includes("row-level security"))
      return "No tienes permiso para realizar esta acción.";
    if (code === "PGRST301" || msg.toLowerCase().includes("jwt"))
      return "Tu sesión expiró. Vuelve a iniciar sesión.";
  }

  return fallback;
}

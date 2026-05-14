function diasDesde(fecha: string | Date): number {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}
import type { Alerta } from "./alertas";

export interface DatosEvaluacion {
  lotes: any[];
  cajas: any[];
  clientes?: any[];
  pedidos?: any[]; // con items o detalles para stock_etapa
  gastos?: any[];
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

const cmp = (op: string, val: number, v1: number, v2?: number | null) => {
  switch (op) {
    case "igual":
      return val === v1;
    case "menor":
      return val < v1;
    case "mayor":
      return val > v1;
    case "entre":
      return v2 != null && val >= Math.min(v1, v2) && val <= Math.max(v1, v2);
    default:
      return false;
  }
};

function reemplazarPlaceholders(msg: string, ctx: Record<string, any>): string {
  return msg.replace(/\{(\w+)\}/g, (_, k) => (ctx[k] != null ? String(ctx[k]) : `{${k}}`));
}

export function evaluarAlertasPersonalizadas(
  customs: any[],
  datos: DatosEvaluacion,
): Alerta[] {
  const out: Alerta[] = [];
  const hoy = new Date();
  const hoyStr = hoyISO();

  for (const c of customs) {
    if (!c.activa) continue;

    if (c.tipo === "recordatorio") {
      // Único: dispara siempre mientras esté activo (visible)
      // Recurrente: dispara si nunca generado o si pasaron cada_x_dias desde ultima_generacion
      let disparar = true;
      if (c.se_repite && c.cada_x_dias) {
        if (c.ultima_generacion) {
          const dias = diasDesde(c.ultima_generacion);
          disparar = dias >= c.cada_x_dias;
        }
      } else if (!c.se_repite && c.ultima_generacion) {
        // único ya generado -> no repetir
        disparar = false;
      }
      if (disparar) {
        out.push({
          id: `custom-${c.id}`,
          tipo: "lote_vacio", // tipo genérico para filtro; no se usa para desactivar
          severidad: "info",
          titulo: `${c.emoji ?? "📌"} ${c.nombre}`,
          descripcion: c.mensaje,
        });
      }
      continue;
    }

    if (c.tipo === "fecha") {
      let disparar = false;
      const ctx: Record<string, any> = {};
      if (c.fecha_tipo === "dia_mes" && c.fecha_dia_mes) {
        disparar = hoy.getDate() === c.fecha_dia_mes;
        ctx.dia = c.fecha_dia_mes;
      } else if (c.fecha_tipo === "unica" && c.fecha_unica) {
        disparar = c.fecha_unica === hoyStr;
        ctx.fecha = c.fecha_unica;
      }
      if (disparar) {
        out.push({
          id: `custom-${c.id}`,
          tipo: "lote_vacio",
          severidad: "info",
          titulo: `${c.emoji ?? "📌"} ${c.nombre}`,
          descripcion: reemplazarPlaceholders(c.mensaje, ctx),
        });
      }
      continue;
    }

    if (c.tipo === "condicion") {
      const v1 = Number(c.condicion_valor_1);
      const v2 = c.condicion_valor_2 != null ? Number(c.condicion_valor_2) : null;
      const op = c.condicion_operador as string;

      if (c.condicion_tipo === "lote_cantidad") {
        const lote = datos.lotes.find((l) => l.id === c.condicion_referencia);
        if (!lote) continue;
        const val = lote.cantidad_actual ?? 0;
        if (cmp(op, val, v1, v2)) {
          out.push({
            id: `custom-${c.id}`,
            tipo: "lote_vacio",
            severidad: "warning",
            titulo: `${c.emoji ?? "📌"} ${c.nombre}`,
            descripcion: reemplazarPlaceholders(c.mensaje, {
              lote: lote.codigo ?? lote.id.slice(0, 6),
              cantidad: val,
              valor: val,
            }),
            loteId: lote.id,
            accion: { label: "Ver lote", href: "/lotes" },
          });
        }
      } else if (c.condicion_tipo === "lote_dias") {
        const lote = datos.lotes.find((l) => l.id === c.condicion_referencia);
        if (!lote) continue;
        const val = diasDesde(lote.fecha_nacimiento);
        if (cmp(op, val, v1, v2)) {
          out.push({
            id: `custom-${c.id}`,
            tipo: "lote_vacio",
            severidad: "info",
            titulo: `${c.emoji ?? "📌"} ${c.nombre}`,
            descripcion: reemplazarPlaceholders(c.mensaje, {
              lote: lote.codigo ?? lote.id.slice(0, 6),
              dias: val,
              valor: val,
            }),
            loteId: lote.id,
            accion: { label: "Ver lote", href: "/lotes" },
          });
        }
      } else if (c.condicion_tipo === "stock_etapa") {
        // Suma cantidad_actual de lotes que coinciden con la etapa (referencia es etapa key)
        // Si no se sabe etapa actual, usar tipo de lote como aproximación
        const etapa = c.condicion_referencia;
        const val = datos.lotes
          .filter((l) => l.tipo === etapa || l.especie === etapa)
          .reduce((s, l) => s + (l.cantidad_actual ?? 0), 0);
        if (cmp(op, val, v1, v2)) {
          out.push({
            id: `custom-${c.id}`,
            tipo: "lote_vacio",
            severidad: "warning",
            titulo: `${c.emoji ?? "📌"} ${c.nombre}`,
            descripcion: reemplazarPlaceholders(c.mensaje, {
              etapa,
              stock: val,
              valor: val,
            }),
          });
        }
      } else if (c.condicion_tipo === "cliente_inactivo") {
        const cliente = (datos.clientes ?? []).find((cl) => cl.id === c.condicion_referencia);
        if (!cliente) continue;
        const pedidosCli = (datos.pedidos ?? []).filter((p) => p.cliente_id === cliente.id);
        if (pedidosCli.length === 0) continue;
        const ultima = pedidosCli
          .map((p) => p.fecha_pedido)
          .sort()
          .reverse()[0];
        const val = diasDesde(ultima);
        if (cmp(op, val, v1, v2)) {
          out.push({
            id: `custom-${c.id}`,
            tipo: "lote_vacio",
            severidad: "warning",
            titulo: `${c.emoji ?? "📌"} ${c.nombre}`,
            descripcion: reemplazarPlaceholders(c.mensaje, {
              cliente: cliente.nombre,
              dias: val,
              valor: val,
            }),
            accion: { label: "Ver cliente", href: "/clientes" },
          });
        }
      } else if (c.condicion_tipo === "gastos_mes") {
        const ahora = new Date();
        const y = ahora.getFullYear();
        const m = ahora.getMonth();
        const val = (datos.gastos ?? [])
          .filter((g) => {
            const f = new Date(g.fecha);
            return f.getFullYear() === y && f.getMonth() === m;
          })
          .reduce((s, g) => s + Number(g.monto ?? 0), 0);
        if (cmp(op, val, v1, v2)) {
          out.push({
            id: `custom-${c.id}`,
            tipo: "lote_vacio",
            severidad: "warning",
            titulo: `${c.emoji ?? "📌"} ${c.nombre}`,
            descripcion: reemplazarPlaceholders(c.mensaje, {
              gastos: val.toFixed(2),
              valor: val.toFixed(2),
            }),
            accion: { label: "Ver gastos", href: "/dashboard" },
          });
        }
      }
    }
  }

  return out;
}

/**
 * Marca recordatorios como generados (actualiza ultima_generacion).
 * Solo afecta a recordatorios disparados (los que aparecen en `disparadas`).
 */
export async function marcarRecordatoriosGenerados(
  supabase: any,
  customs: any[],
  disparadas: Alerta[],
) {
  const ids = new Set(
    disparadas.map((a) => a.id.replace(/^custom-/, "")),
  );
  const recordatoriosDisparados = customs.filter(
    (c) => c.tipo === "recordatorio" && ids.has(c.id),
  );
  if (recordatoriosDisparados.length === 0) return;
  const hoy = hoyISO();
  await Promise.all(
    recordatoriosDisparados.map((c) =>
      supabase
        .from("alertas_personalizadas")
        .update({ ultima_generacion: hoy })
        .eq("id", c.id),
    ),
  );
}

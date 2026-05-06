import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { invalidateLoteEventos } from "@/lib/invalidations";
import { useCajaOptions } from "@/data/options";

export type EventoTipo = "mortalidad" | "venta" | "traslado_caja" | "ajuste" | "nota";

interface EventoDialogProps {
  lote: {
    id: string;
    codigo: string | null;
    cantidad_actual: number | null;
    caja_id: string | null;
  } | null;
  tipo: EventoTipo;
  open: boolean;
  onClose: () => void;
}

const TIPO_TITULO: Record<EventoTipo, string> = {
  mortalidad: "Registrar mortalidad",
  venta: "Registrar venta",
  traslado_caja: "Trasladar a otra caja",
  ajuste: "Ajuste de stock",
  nota: "Añadir nota",
};

const TIPO_DESC: Record<EventoTipo, string> = {
  mortalidad: "Resta del stock del lote.",
  venta: "Resta del stock y registra precio (opcional).",
  traslado_caja: "Cambia la caja del lote y deja registro.",
  ajuste: "Suma o resta unidades (positivo suma, negativo resta).",
  nota: "Solo informativo, no afecta el stock.",
};

export default function EventoDialog({ lote, tipo, open, onClose }: EventoDialogProps) {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [fecha, setFecha] = useState(today);
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [cajaDestino, setCajaDestino] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (open) {
      setFecha(today);
      setCantidad("");
      setPrecio("");
      setCajaDestino("");
      setNotas("");
    }
  }, [open, today]);

  const { data: cajas = [] } = useCajaOptions({
    includeEstado: true,
    enabled: open && tipo === "traslado_caja",
  });

  const crear = useMutation({
    mutationFn: async () => {
      if (!lote || !profile) throw new Error("Faltan datos");
      let qty = parseInt(cantidad) || 0;
      // ajuste permite negativos vía signo, pero la columna acepta enteros; usamos absoluto + signo en notas
      const payload: any = {
        organization_id: profile.organization_id,
        lote_id: lote.id,
        tipo,
        fecha,
        cantidad: tipo === "nota" || tipo === "traslado_caja" ? 0 : qty,
        notas: notas || null,
        created_by: user?.id ?? null,
      };
      if (tipo === "venta" && precio) {
        payload.precio_unitario = parseFloat(precio);
      }
      if (tipo === "traslado_caja") {
        if (!cajaDestino) throw new Error("Selecciona caja destino");
        payload.caja_destino_id = cajaDestino;
      }
      if ((tipo === "mortalidad" || tipo === "venta") && qty <= 0) {
        throw new Error("La cantidad debe ser mayor a 0");
      }
      if ((tipo === "mortalidad" || tipo === "venta") && qty > (lote.cantidad_actual ?? 0)) {
        throw new Error(`Solo hay ${lote.cantidad_actual ?? 0} individuos disponibles`);
      }
      const { error } = await supabase.from("lote_eventos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lotes"] });
      qc.invalidateQueries({ queryKey: ["lotes-dash"] });
      qc.invalidateQueries({ queryKey: ["lotes-stock"] });
      qc.invalidateQueries({ queryKey: ["lote-eventos"] });
      qc.invalidateQueries({ queryKey: ["lote-detalle"] });
      toast.success("Evento registrado");
      onClose();
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  if (!lote) return null;

  const showCantidad = tipo !== "nota" && tipo !== "traslado_caja";
  const cajasDisponibles = (cajas as any[]).filter(
    (c) => c.id !== lote.caja_id && c.estado !== "mantenimiento",
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="display-font">{TIPO_TITULO[tipo]}</DialogTitle>
          <DialogDescription>
            Lote <strong className="text-foreground">{lote.codigo || lote.id.slice(0, 8)}</strong> ·{" "}
            {lote.cantidad_actual} ind. disponibles. {TIPO_DESC[tipo]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            {showCantidad && (
              <div className="space-y-2">
                <Label>Cantidad {tipo === "ajuste" && <span className="text-muted-foreground text-xs">(+/−)</span>}</Label>
                <Input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="0"
                />
              </div>
            )}
          </div>

          {tipo === "venta" && (
            <div className="space-y-2">
              <Label>Precio unitario (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Ej: 25.00"
              />
            </div>
          )}

          {tipo === "traslado_caja" && (
            <div className="space-y-2">
              <Label>Caja destino *</Label>
              <Select value={cajaDestino} onValueChange={setCajaDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona caja" />
                </SelectTrigger>
                <SelectContent>
                  {cajasDisponibles.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codigo} ({c.uso})
                    </SelectItem>
                  ))}
                  {cajasDisponibles.length === 0 && (
                    <div className="px-2 py-3 text-xs text-muted-foreground">
                      No hay otras cajas disponibles
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Detalles del evento..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => crear.mutate()}
            disabled={crear.isPending}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

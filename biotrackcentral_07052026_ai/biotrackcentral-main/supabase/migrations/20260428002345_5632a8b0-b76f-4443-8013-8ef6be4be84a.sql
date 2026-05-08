-- Enums
CREATE TYPE public.cliente_tipo AS ENUM ('general', 'laboratorio', 'centro_investigacion', 'veterinario');
CREATE TYPE public.cliente_estado AS ENUM ('activo', 'inactivo', 'bloqueado');
CREATE TYPE public.pedido_estado AS ENUM ('pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado');

-- Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  contacto_principal TEXT,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  ciudad TEXT,
  estado TEXT,
  codigo_postal TEXT,
  pais TEXT DEFAULT 'Mexico',
  rfc TEXT,
  tipo_cliente public.cliente_tipo NOT NULL DEFAULT 'general',
  estado_cliente public.cliente_estado NOT NULL DEFAULT 'activo',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_cliente_org UNIQUE (organization_id, nombre)
);

CREATE INDEX idx_clientes_org ON public.clientes(organization_id);
CREATE INDEX idx_clientes_estado ON public.clientes(estado_cliente);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org select clientes" ON public.clientes FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org insert clientes" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org update clientes" ON public.clientes FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org delete clientes" ON public.clientes FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Pedidos
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero_pedido TEXT NOT NULL,
  fecha_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega_solicitada DATE,
  fecha_entrega_realizada DATE,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  porcentaje_descuento NUMERIC(5,2) NOT NULL DEFAULT 0,
  monto_descuento NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  estado public.pedido_estado NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_pedido_numero UNIQUE (organization_id, numero_pedido)
);

CREATE INDEX idx_pedidos_org ON public.pedidos(organization_id);
CREATE INDEX idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX idx_pedidos_estado ON public.pedidos(estado);
CREATE INDEX idx_pedidos_fecha ON public.pedidos(fecha_pedido);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org select pedidos" ON public.pedidos FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org insert pedidos" ON public.pedidos FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org update pedidos" ON public.pedidos FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org delete pedidos" ON public.pedidos FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Pedidos detalles
CREATE TABLE public.pedidos_detalles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  especie TEXT NOT NULL,
  etapa TEXT NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedidos_detalles_pedido ON public.pedidos_detalles(pedido_id);

ALTER TABLE public.pedidos_detalles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org select pedidos_detalles" ON public.pedidos_detalles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedidos_detalles.pedido_id
      AND p.organization_id = public.get_user_org(auth.uid())
  ));
CREATE POLICY "Org insert pedidos_detalles" ON public.pedidos_detalles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedidos_detalles.pedido_id
      AND p.organization_id = public.get_user_org(auth.uid())
  ));
CREATE POLICY "Org update pedidos_detalles" ON public.pedidos_detalles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedidos_detalles.pedido_id
      AND p.organization_id = public.get_user_org(auth.uid())
  ));
CREATE POLICY "Org delete pedidos_detalles" ON public.pedidos_detalles FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedidos_detalles.pedido_id
      AND p.organization_id = public.get_user_org(auth.uid())
  ));

CREATE TRIGGER trg_pedidos_detalles_updated_at
  BEFORE UPDATE ON public.pedidos_detalles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
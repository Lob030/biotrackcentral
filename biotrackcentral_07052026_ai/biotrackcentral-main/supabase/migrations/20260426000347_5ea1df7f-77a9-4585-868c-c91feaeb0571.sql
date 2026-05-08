-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'trabajador');
CREATE TYPE public.especie_type AS ENUM ('ASF', 'Raton', 'Rata');
CREATE TYPE public.lote_tipo AS ENUM ('nacimiento', 'engorda', 'reproduccion');
CREATE TYPE public.lote_estado AS ENUM ('activo', 'dividido', 'finalizado');
CREATE TYPE public.lote_sexo AS ENUM ('machos', 'hembras', 'mixto');
CREATE TYPE public.caja_uso AS ENUM ('reproductor', 'engorda');
CREATE TYPE public.caja_estado AS ENUM ('libre', 'ocupada', 'limpieza');

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Lineas geneticas
CREATE TABLE public.lineas_geneticas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  especie especie_type NOT NULL,
  origen TEXT,
  fecha_registro DATE DEFAULT CURRENT_DATE,
  color_etiqueta TEXT DEFAULT '#06b6d4',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cajas
CREATE TABLE public.cajas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  ubicacion TEXT,
  capacidad INTEGER,
  uso caja_uso NOT NULL,
  estado caja_estado NOT NULL DEFAULT 'libre',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lotes
CREATE TABLE public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  codigo TEXT,
  tipo lote_tipo NOT NULL DEFAULT 'nacimiento',
  especie especie_type NOT NULL,
  linea_genetica_id UUID REFERENCES public.lineas_geneticas(id) ON DELETE SET NULL,
  caja_id UUID REFERENCES public.cajas(id) ON DELETE SET NULL,
  fecha_nacimiento DATE NOT NULL,
  fecha_introduccion_caja DATE,
  fecha_nacimiento_original DATE,
  cantidad_inicial INTEGER DEFAULT 0,
  cantidad_actual INTEGER DEFAULT 0,
  machos INTEGER DEFAULT 0,
  hembras INTEGER DEFAULT 0,
  estado lote_estado NOT NULL DEFAULT 'activo',
  lote_padre_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  sexo lote_sexo,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX idx_lineas_org ON public.lineas_geneticas(organization_id);
CREATE INDEX idx_cajas_org ON public.cajas(organization_id);
CREATE INDEX idx_lotes_org ON public.lotes(organization_id);
CREATE INDEX idx_lotes_caja ON public.lotes(caja_id);
CREATE INDEX idx_lotes_linea ON public.lotes(linea_genetica_id);

-- Security definer functions (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_org(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

-- Trigger: auto-create org + profile + admin role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  display_name TEXT;
BEGIN
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'nombre',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.organizations (nombre)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'organizacion', 'Bioterio de ' || display_name))
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, organization_id, nombre, email)
  VALUES (NEW.id, new_org_id, display_name, NEW.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_lineas_updated BEFORE UPDATE ON public.lineas_geneticas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_cajas_updated BEFORE UPDATE ON public.cajas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_lotes_updated BEFORE UPDATE ON public.lotes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineas_geneticas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT TO authenticated
USING (id = public.get_user_org(auth.uid()));

CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE TO authenticated
USING (id = public.get_user_org(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users view profiles in their org"
ON public.profiles FOR SELECT TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Users update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid());

-- User roles policies
CREATE POLICY "Users see their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Lineas geneticas: org-scoped CRUD for authenticated
CREATE POLICY "Org select lineas" ON public.lineas_geneticas FOR SELECT TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org insert lineas" ON public.lineas_geneticas FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org update lineas" ON public.lineas_geneticas FOR UPDATE TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org delete lineas" ON public.lineas_geneticas FOR DELETE TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));

-- Cajas
CREATE POLICY "Org select cajas" ON public.cajas FOR SELECT TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org insert cajas" ON public.cajas FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org update cajas" ON public.cajas FOR UPDATE TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org delete cajas" ON public.cajas FOR DELETE TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));

-- Lotes
CREATE POLICY "Org select lotes" ON public.lotes FOR SELECT TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org insert lotes" ON public.lotes FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org update lotes" ON public.lotes FOR UPDATE TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org delete lotes" ON public.lotes FOR DELETE TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));
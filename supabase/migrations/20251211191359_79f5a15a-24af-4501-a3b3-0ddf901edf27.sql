-- =====================================================
-- RCReyes - Control de Pistas de Radio Control
-- Migración inicial: Esquema completo MVP
-- =====================================================

-- 1. Crear enum para roles de usuario
CREATE TYPE public.app_role AS ENUM ('operador', 'supervisor', 'admin', 'root');

-- 2. Crear enum para tipo de cliente
CREATE TYPE public.tipo_cliente AS ENUM ('regular', 'miembro', 'invitado');

-- 3. Crear enum para estado de ticket
CREATE TYPE public.estado_ticket AS ENUM ('activo', 'pausado', 'cerrado', 'cancelado');

-- 4. Crear enum para tipo de costo de servicio
CREATE TYPE public.tipo_costo AS ENUM ('fijo', 'por_tiempo', 'paquete');

-- 5. Crear enum para tipo de redondeo
CREATE TYPE public.tipo_redondeo AS ENUM ('arriba', 'abajo', 'estandar');

-- 6. Crear enum para método de pago
CREATE TYPE public.metodo_pago AS ENUM ('efectivo', 'tarjeta', 'transferencia', 'otro');

-- =====================================================
-- TABLA: profiles (información adicional de usuarios)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TABLA: user_roles (roles de usuario - separada por seguridad)
-- =====================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'operador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCIÓN: has_role (verificar rol de usuario - SECURITY DEFINER)
-- =====================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =====================================================
-- FUNCIÓN: get_user_role (obtener rol del usuario)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =====================================================
-- FUNCIÓN: is_admin_or_higher (verificar si es admin o superior)
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_admin_or_higher(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'root')
  )
$$;

-- =====================================================
-- FUNCIÓN: is_supervisor_or_higher (verificar si es supervisor o superior)
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_supervisor_or_higher(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('supervisor', 'admin', 'root')
  )
$$;

-- =====================================================
-- TABLA: clientes
-- =====================================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo_cliente tipo_cliente NOT NULL DEFAULT 'regular',
  telefono TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TABLA: tarifas_hora
-- =====================================================
CREATE TABLE public.tarifas_hora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  precio_por_hora DECIMAL(10,2) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  aplicable_desde TIMESTAMPTZ,
  aplicable_hasta TIMESTAMPTZ,
  minutos_minimos INTEGER NOT NULL DEFAULT 10,
  tipo_redondeo tipo_redondeo NOT NULL DEFAULT 'arriba',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tarifas_hora ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TABLA: servicios
-- =====================================================
CREATE TABLE public.servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo_costo tipo_costo NOT NULL DEFAULT 'fijo',
  precio DECIMAL(10,2) NOT NULL,
  requiere_inventario BOOLEAN NOT NULL DEFAULT false,
  stock_actual INTEGER,
  maximo_por_ticket INTEGER,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNCIÓN: generar_codigo_ticket
-- =====================================================
CREATE OR REPLACE FUNCTION public.generar_codigo_ticket()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  nuevo_codigo TEXT;
  contador INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 4) AS INTEGER)), 0) + 1
  INTO contador
  FROM public.tickets;
  
  nuevo_codigo := 'RC-' || LPAD(contador::TEXT, 6, '0');
  RETURN nuevo_codigo;
END;
$$;

-- =====================================================
-- TABLA: tickets
-- =====================================================
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE DEFAULT public.generar_codigo_ticket(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  personas INTEGER NOT NULL DEFAULT 1 CHECK (personas >= 1),
  estado estado_ticket NOT NULL DEFAULT 'activo',
  hora_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  hora_salida TIMESTAMPTZ,
  tarifa_hora_id UUID NOT NULL REFERENCES public.tarifas_hora(id) ON DELETE RESTRICT,
  operador_entrada_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  operador_salida_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  total_tiempo_cobrado_minutos INTEGER,
  monto_tiempo DECIMAL(10,2),
  monto_servicios DECIMAL(10,2),
  monto_total DECIMAL(10,2),
  metodo_pago metodo_pago,
  motivo_cancelacion TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TABLA: ticket_servicios
-- =====================================================
CREATE TABLE public.ticket_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad >= 1),
  precio_unitario DECIMAL(10,2) NOT NULL,
  monto_total DECIMAL(10,2) NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_servicios ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TABLA: auditorias
-- =====================================================
CREATE TABLE public.auditorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accion TEXT NOT NULL,
  entidad TEXT,
  entidad_id UUID,
  detalle JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auditorias ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TABLA: pausas_ticket (para rastrear pausas)
-- =====================================================
CREATE TABLE public.pausas_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  inicio_pausa TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin_pausa TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pausas_ticket ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Profiles: usuarios pueden ver su propio perfil, admins pueden ver todos
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin_or_higher(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles: solo admins pueden gestionar roles
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin_or_higher(auth.uid()));

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Clientes: todos los usuarios autenticados pueden CRUD
CREATE POLICY "Authenticated users can manage clientes"
  ON public.clientes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tarifas: todos pueden leer, solo admins pueden modificar
CREATE POLICY "Anyone can read tarifas"
  ON public.tarifas_hora FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tarifas"
  ON public.tarifas_hora FOR ALL
  USING (public.is_admin_or_higher(auth.uid()));

-- Servicios: todos pueden leer, solo admins pueden modificar
CREATE POLICY "Anyone can read servicios"
  ON public.servicios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage servicios"
  ON public.servicios FOR ALL
  USING (public.is_admin_or_higher(auth.uid()));

-- Tickets: todos los usuarios autenticados pueden gestionar
CREATE POLICY "Authenticated users can manage tickets"
  ON public.tickets FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ticket servicios: acceso basado en ticket
CREATE POLICY "Authenticated users can manage ticket_servicios"
  ON public.ticket_servicios FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Auditorias: solo lectura para admins, inserción para todos
CREATE POLICY "Authenticated users can insert auditorias"
  ON public.auditorias FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read auditorias"
  ON public.auditorias FOR SELECT
  USING (public.is_admin_or_higher(auth.uid()));

-- Pausas ticket: acceso basado en tickets
CREATE POLICY "Authenticated users can manage pausas"
  ON public.pausas_ticket FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS para updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tarifas_updated_at
  BEFORE UPDATE ON public.tarifas_hora
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_servicios_updated_at
  BEFORE UPDATE ON public.servicios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCIÓN: crear perfil automáticamente al registrarse
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', NEW.email),
    NEW.email
  );
  
  -- Asignar rol por defecto (operador)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCIÓN: calcular tiempo cobrable
-- =====================================================
CREATE OR REPLACE FUNCTION public.calcular_tiempo_cobrable(
  p_ticket_id UUID
)
RETURNS TABLE(
  tiempo_real_minutos INTEGER,
  tiempo_cobrado_minutos INTEGER,
  costo_tiempo DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hora_entrada TIMESTAMPTZ;
  v_hora_salida TIMESTAMPTZ;
  v_tiempo_total_minutos INTEGER;
  v_tiempo_pausas_minutos INTEGER;
  v_tiempo_real INTEGER;
  v_tiempo_cobrado INTEGER;
  v_precio_hora DECIMAL(10,2);
  v_minutos_minimos INTEGER;
  v_redondeo tipo_redondeo;
BEGIN
  -- Obtener datos del ticket y tarifa
  SELECT 
    t.hora_entrada,
    COALESCE(t.hora_salida, now()),
    th.precio_por_hora,
    th.minutos_minimos,
    th.tipo_redondeo
  INTO 
    v_hora_entrada,
    v_hora_salida,
    v_precio_hora,
    v_minutos_minimos,
    v_redondeo
  FROM tickets t
  JOIN tarifas_hora th ON t.tarifa_hora_id = th.id
  WHERE t.id = p_ticket_id;
  
  -- Calcular tiempo total en minutos
  v_tiempo_total_minutos := EXTRACT(EPOCH FROM (v_hora_salida - v_hora_entrada)) / 60;
  
  -- Calcular tiempo de pausas
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (COALESCE(fin_pausa, now()) - inicio_pausa)) / 60
  ), 0)::INTEGER
  INTO v_tiempo_pausas_minutos
  FROM pausas_ticket
  WHERE ticket_id = p_ticket_id;
  
  -- Tiempo real = total - pausas
  v_tiempo_real := GREATEST(v_tiempo_total_minutos - v_tiempo_pausas_minutos, 0);
  
  -- Aplicar mínimos
  v_tiempo_cobrado := GREATEST(v_tiempo_real, v_minutos_minimos);
  
  -- Aplicar redondeo (a bloques de 5 minutos)
  CASE v_redondeo
    WHEN 'arriba' THEN
      v_tiempo_cobrado := CEIL(v_tiempo_cobrado::DECIMAL / 5) * 5;
    WHEN 'abajo' THEN
      v_tiempo_cobrado := FLOOR(v_tiempo_cobrado::DECIMAL / 5) * 5;
    WHEN 'estandar' THEN
      v_tiempo_cobrado := ROUND(v_tiempo_cobrado::DECIMAL / 5) * 5;
  END CASE;
  
  -- Asegurar mínimo después del redondeo
  v_tiempo_cobrado := GREATEST(v_tiempo_cobrado, v_minutos_minimos);
  
  RETURN QUERY SELECT 
    v_tiempo_real,
    v_tiempo_cobrado,
    ROUND((v_tiempo_cobrado::DECIMAL / 60) * v_precio_hora, 2);
END;
$$;

-- Habilitar realtime para tickets (actualizaciones en vivo)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
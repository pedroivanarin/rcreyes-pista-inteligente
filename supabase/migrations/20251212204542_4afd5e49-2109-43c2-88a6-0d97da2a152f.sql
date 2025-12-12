-- =============================================
-- SISTEMA DE MEMBRESÍAS - RCReyes (Corrección)
-- =============================================

-- 1. Crear enum para tipos de membresía con descuento (si no existe)
DO $$ BEGIN
  CREATE TYPE public.tipo_membresia AS ENUM ('ninguna', 'basica', 'premium', 'vip');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Modificar tabla clientes para incluir membresía y código único
ALTER TABLE public.clientes 
  ADD COLUMN IF NOT EXISTS codigo_cliente TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS membresia tipo_membresia DEFAULT 'ninguna',
  ADD COLUMN IF NOT EXISTS descuento_porcentaje INTEGER DEFAULT 0;

-- 3. Crear función para generar código de cliente único
CREATE OR REPLACE FUNCTION public.generar_codigo_cliente()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nuevo_codigo TEXT;
  contador INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_cliente FROM 5) AS INTEGER)), 0) + 1
  INTO contador
  FROM public.clientes
  WHERE codigo_cliente IS NOT NULL AND codigo_cliente ~ '^RCM-[0-9]+$';
  
  nuevo_codigo := 'RCM-' || LPAD(contador::TEXT, 5, '0');
  RETURN nuevo_codigo;
END;
$$;

-- 4. Crear trigger para asignar código automáticamente
CREATE OR REPLACE FUNCTION public.auto_assign_cliente_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_cliente IS NULL THEN
    NEW.codigo_cliente := generar_codigo_cliente();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_codigo_cliente ON clientes;
CREATE TRIGGER trigger_auto_codigo_cliente
  BEFORE INSERT ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_cliente_codigo();

-- 5. Asignar códigos a clientes existentes usando CTE
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.clientes
  WHERE codigo_cliente IS NULL
)
UPDATE public.clientes c
SET codigo_cliente = 'RCM-' || LPAD(n.rn::TEXT, 5, '0')
FROM numbered n
WHERE c.id = n.id;

-- 6. Modificar política para permitir a operadores crear clientes
DROP POLICY IF EXISTS "Authenticated users can insert clientes" ON clientes;
CREATE POLICY "Authenticated users can insert clientes" 
ON clientes FOR INSERT TO authenticated 
WITH CHECK (true);
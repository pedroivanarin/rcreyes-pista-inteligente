-- Corregir funciones sin search_path

-- Actualizar generar_codigo_ticket con search_path
CREATE OR REPLACE FUNCTION public.generar_codigo_ticket()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Actualizar update_updated_at_column con search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
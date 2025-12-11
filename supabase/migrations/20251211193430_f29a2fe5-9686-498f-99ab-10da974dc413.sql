
-- Actualizar función de cálculo de tiempo cobrable con nuevas reglas:
-- 1. Mínimo 1 hora
-- 2. Después de la primera hora, bloques de 15 minutos
-- 3. 5 minutos de tolerancia antes de cobrar el siguiente bloque

CREATE OR REPLACE FUNCTION public.calcular_tiempo_cobrable(p_ticket_id uuid)
 RETURNS TABLE(tiempo_real_minutos integer, tiempo_cobrado_minutos integer, costo_tiempo numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hora_entrada TIMESTAMPTZ;
  v_hora_salida TIMESTAMPTZ;
  v_tiempo_total_minutos INTEGER;
  v_tiempo_pausas_minutos INTEGER;
  v_tiempo_real INTEGER;
  v_tiempo_cobrado INTEGER;
  v_precio_hora DECIMAL(10,2);
  v_minutos_extra INTEGER;
  v_bloques_extra INTEGER;
BEGIN
  -- Obtener datos del ticket y tarifa
  SELECT 
    t.hora_entrada,
    COALESCE(t.hora_salida, now()),
    th.precio_por_hora
  INTO 
    v_hora_entrada,
    v_hora_salida,
    v_precio_hora
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
  
  -- NUEVAS REGLAS DE COBRO:
  -- 1. Mínimo 1 hora (60 minutos)
  IF v_tiempo_real <= 60 THEN
    v_tiempo_cobrado := 60;
  ELSE
    -- 2. Después de la primera hora, bloques de 15 minutos con 5 min de tolerancia
    v_minutos_extra := v_tiempo_real - 60;
    
    -- Calcular bloques de 15 min necesarios
    -- Si los minutos extra son <= 5 (tolerancia), no se cobra bloque adicional
    -- Si son 6-20 min, se cobra 1 bloque (15 min)
    -- Si son 21-35 min, se cobra 2 bloques (30 min)
    -- etc.
    IF v_minutos_extra <= 5 THEN
      v_bloques_extra := 0;
    ELSE
      -- Restar tolerancia y calcular bloques redondeando hacia arriba
      v_bloques_extra := CEIL((v_minutos_extra - 5)::DECIMAL / 15);
    END IF;
    
    v_tiempo_cobrado := 60 + (v_bloques_extra * 15);
  END IF;
  
  RETURN QUERY SELECT 
    v_tiempo_real,
    v_tiempo_cobrado,
    ROUND((v_tiempo_cobrado::DECIMAL / 60) * v_precio_hora, 2);
END;
$function$;

-- Actualizar tarifas existentes para reflejar las nuevas reglas
UPDATE public.tarifas_hora 
SET minutos_minimos = 60
WHERE activo = true;

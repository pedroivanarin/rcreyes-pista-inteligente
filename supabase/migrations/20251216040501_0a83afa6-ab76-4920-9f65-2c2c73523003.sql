-- Permitir que operadores actualicen tickets (estado, pausas)
-- Reemplazar política restrictiva con una más permisiva para operaciones normales
DROP POLICY IF EXISTS "Supervisors can update tickets" ON public.tickets;

-- Nueva política: cualquier usuario autenticado puede actualizar tickets activos/pausados
-- (pero no pueden modificar tickets cerrados/cancelados excepto supervisores)
CREATE POLICY "Authenticated users can update active tickets" 
ON public.tickets 
FOR UPDATE 
USING (
  -- Supervisores pueden actualizar cualquier ticket
  is_supervisor_or_higher(auth.uid())
  OR
  -- Operadores solo pueden actualizar tickets activos/pausados
  (estado IN ('activo', 'pausado'))
);
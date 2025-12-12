-- =============================================
-- CORRECCIÓN DE POLÍTICAS RLS - RCReyes
-- Fecha: 2025-01-12
-- =============================================

-- 1. TABLA: clientes
-- Problema: Cualquier usuario autenticado puede modificar/eliminar clientes
-- Solución: Lectura para todos, escritura solo para admins
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage clientes" ON clientes;

CREATE POLICY "Authenticated users can read clientes" 
ON clientes FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Admins can insert clientes" 
ON clientes FOR INSERT TO authenticated 
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can update clientes" 
ON clientes FOR UPDATE TO authenticated 
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can delete clientes" 
ON clientes FOR DELETE TO authenticated 
USING (is_admin_or_higher(auth.uid()));

-- 2. TABLA: tickets
-- Problema: Cualquier operador puede modificar montos y eliminar tickets
-- Solución: Crear para todos, leer para todos, actualizar para supervisores+, eliminar solo admins
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage tickets" ON tickets;

CREATE POLICY "Authenticated users can read tickets" 
ON tickets FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can create tickets" 
ON tickets FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = operador_entrada_id);

CREATE POLICY "Supervisors can update tickets" 
ON tickets FOR UPDATE TO authenticated 
USING (is_supervisor_or_higher(auth.uid()));

CREATE POLICY "Admins can delete tickets" 
ON tickets FOR DELETE TO authenticated 
USING (is_admin_or_higher(auth.uid()));

-- 3. TABLA: ticket_servicios
-- Problema: Precios modificables por cualquiera
-- Solución: Crear para todos, leer para todos, modificar/eliminar solo admins
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage ticket_servicios" ON ticket_servicios;

CREATE POLICY "Authenticated users can read ticket_servicios" 
ON ticket_servicios FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert ticket_servicios" 
ON ticket_servicios FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Admins can update ticket_servicios" 
ON ticket_servicios FOR UPDATE TO authenticated 
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can delete ticket_servicios" 
ON ticket_servicios FOR DELETE TO authenticated 
USING (is_admin_or_higher(auth.uid()));

-- 4. TABLA: pausas_ticket
-- Problema: Pausas manipulables para fraude en cobros
-- Solución: Crear/leer para todos, modificar/eliminar para supervisores+
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can manage pausas" ON pausas_ticket;

CREATE POLICY "Authenticated users can read pausas" 
ON pausas_ticket FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert pausas" 
ON pausas_ticket FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Supervisors can update pausas" 
ON pausas_ticket FOR UPDATE TO authenticated 
USING (is_supervisor_or_higher(auth.uid()));

CREATE POLICY "Supervisors can delete pausas" 
ON pausas_ticket FOR DELETE TO authenticated 
USING (is_supervisor_or_higher(auth.uid()));
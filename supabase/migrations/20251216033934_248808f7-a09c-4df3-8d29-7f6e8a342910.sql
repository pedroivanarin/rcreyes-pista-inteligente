-- Tabla para registrar cierres de día
CREATE TABLE public.cierres_dia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  user_id UUID NOT NULL,
  tickets_abiertos INTEGER NOT NULL DEFAULT 0,
  tickets_cerrados INTEGER NOT NULL DEFAULT 0,
  tickets_cancelados INTEGER NOT NULL DEFAULT 0,
  total_cobrado NUMERIC(10,2) NOT NULL DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fecha)
);

-- Enable RLS
ALTER TABLE public.cierres_dia ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can read cierres"
ON public.cierres_dia
FOR SELECT
USING (true);

CREATE POLICY "Supervisors can insert cierres"
ON public.cierres_dia
FOR INSERT
WITH CHECK (is_supervisor_or_higher(auth.uid()));

CREATE POLICY "Admins can update cierres"
ON public.cierres_dia
FOR UPDATE
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can delete cierres"
ON public.cierres_dia
FOR DELETE
USING (is_admin_or_higher(auth.uid()));
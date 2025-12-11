-- Agregar columna de ícono a servicios
ALTER TABLE public.servicios 
ADD COLUMN IF NOT EXISTS icono TEXT DEFAULT 'package';
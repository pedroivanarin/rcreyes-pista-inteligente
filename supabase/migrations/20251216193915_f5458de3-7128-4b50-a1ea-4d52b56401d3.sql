-- Agregar campo es_renta para diferenciar consumibles de rentas
ALTER TABLE public.servicios 
ADD COLUMN es_renta boolean NOT NULL DEFAULT false;

-- Comentario explicativo
COMMENT ON COLUMN public.servicios.es_renta IS 'true = artículo rentable que se devuelve al cobrar (ej: autos RC), false = consumible que no se devuelve (ej: bebidas)';
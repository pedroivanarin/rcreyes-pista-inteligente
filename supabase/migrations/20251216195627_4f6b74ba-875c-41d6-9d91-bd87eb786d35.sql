-- Add column to store print preference (individual tickets vs group ticket)
ALTER TABLE public.tickets
ADD COLUMN imprimir_individual BOOLEAN NOT NULL DEFAULT true;
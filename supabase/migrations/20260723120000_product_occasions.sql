-- Permite escolher, por produto, para quais ocasiões especiais ele aparece.
-- Guarda os ids das ocasiões (ex.: 'casamento', 'aniversario') numa lista.
-- Vazio = o produto não aparece em nenhuma ocasião específica.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS occasions text[] NOT NULL DEFAULT '{}';

-- Separa "quem envia" (customer_name/customer_phone, já existentes) de "quem
-- recebe" o presente. Até aqui só existia um nome no pedido — o comprovante
-- de entrega mostrava o nome de quem compra como se fosse o destinatário.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS reference_point TEXT;

COMMENT ON COLUMN public.orders.customer_name IS 'Nome de quem compra/envia o presente (comprador).';
COMMENT ON COLUMN public.orders.customer_phone IS 'Telefone de quem compra/envia o presente (comprador).';
COMMENT ON COLUMN public.orders.recipient_name IS 'Nome de quem recebe o presente (destinatário) — separado do comprador desde 2026-08-08.';
COMMENT ON COLUMN public.orders.recipient_phone IS 'Telefone de contato de quem recebe o presente, usado pelo entregador.';
COMMENT ON COLUMN public.orders.reference_point IS 'Ponto de referência do endereço de entrega.';

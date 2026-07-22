-- Correções para reconectar o checkout do site à tabela de pedidos.
--
-- Problema 1: a tabela exigia delivery_type IN ('pickup','delivery') (inglês),
-- mas o trigger de validação e a policy de INSERT exigem ('entrega','retirada')
-- (português). Nenhum valor satisfazia os dois => qualquer insert falhava.
-- Padronizamos tudo em português.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_delivery_type_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_type_check
  CHECK (delivery_type IN ('entrega', 'retirada'));

-- Problema 2: o trigger sobrescrevia SEMPRE o order_number com um novo valor da
-- sequence, então o número mostrado no WhatsApp nunca batia com o do banco.
-- Agora o trigger respeita um order_number enviado pelo site (e só gera um da
-- sequence quando nenhum é informado). O resto da validação (recalcular o total
-- a partir dos itens = anti-fraude) continua igual.
CREATE OR REPLACE FUNCTION public.validate_new_order()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  computed_total numeric := 0;
  item jsonb;
  qty numeric;
  price numeric;
BEGIN
  -- Força status seguro
  NEW.status := 'pendente';

  -- Mantém o order_number enviado pelo site; só gera um se vier vazio
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'BMQ-' || nextval('order_number_seq');
  END IF;

  -- Itens precisam ser um array não vazio
  IF NEW.items IS NULL OR jsonb_typeof(NEW.items) <> 'array' OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF jsonb_array_length(NEW.items) > 100 THEN
    RAISE EXCEPTION 'Too many items in order';
  END IF;

  -- Recalcula o total a partir dos itens (impede adulteração pelo cliente)
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
    price := COALESCE((item->>'price')::numeric, 0);
    qty := COALESCE((item->>'quantity')::numeric, 0);
    IF price < 0 OR qty <= 0 THEN
      RAISE EXCEPTION 'Invalid item price or quantity';
    END IF;
    computed_total := computed_total + (price * qty);
  END LOOP;

  NEW.total := computed_total;

  IF NEW.total <= 0 THEN
    RAISE EXCEPTION 'Order total must be positive';
  END IF;

  -- Limites de tamanho básicos
  IF length(COALESCE(NEW.customer_name, '')) > 200
     OR length(COALESCE(NEW.customer_phone, '')) > 40
     OR length(COALESCE(NEW.customer_email, '')) > 200
     OR length(COALESCE(NEW.notes, '')) > 2000 THEN
    RAISE EXCEPTION 'Field length exceeds limit';
  END IF;

  IF NEW.delivery_type NOT IN ('entrega', 'retirada') THEN
    RAISE EXCEPTION 'Invalid delivery_type';
  END IF;

  IF NEW.payment_method NOT IN ('pix', 'dinheiro', 'cartao') THEN
    RAISE EXCEPTION 'Invalid payment_method';
  END IF;

  RETURN NEW;
END;
$$;

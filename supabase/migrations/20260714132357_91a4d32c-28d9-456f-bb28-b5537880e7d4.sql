
-- 1. Explicit no-public-read SELECT policy (service_role bypasses RLS, admin still works)
DROP POLICY IF EXISTS "No public read of orders" ON public.orders;
CREATE POLICY "No public read of orders" ON public.orders FOR SELECT USING (false);

-- 2. Validation trigger for inserts
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
  -- Force safe defaults
  NEW.status := 'pendente';
  NEW.order_number := 'BMQ-' || nextval('order_number_seq');

  -- Items must be a non-empty array
  IF NEW.items IS NULL OR jsonb_typeof(NEW.items) <> 'array' OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF jsonb_array_length(NEW.items) > 100 THEN
    RAISE EXCEPTION 'Too many items in order';
  END IF;

  -- Recompute total from items to prevent client tampering
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

  -- Basic string length limits to reduce abuse
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

DROP TRIGGER IF EXISTS validate_new_order_trigger ON public.orders;
CREATE TRIGGER validate_new_order_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_new_order();

-- 3. Tighten INSERT policy: keep public insert but rely on trigger for validation.
-- Replace the always-true policy with one that still allows anon inserts but documents intent.
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
CREATE POLICY "Public can submit orders" ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pendente'
    AND total > 0
    AND jsonb_typeof(items) = 'array'
    AND jsonb_array_length(items) > 0
    AND delivery_type IN ('entrega', 'retirada')
    AND payment_method IN ('pix', 'dinheiro', 'cartao')
  );

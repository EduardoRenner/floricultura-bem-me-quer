-- Bootstrap do schema completo para um projeto Supabase novo.
--
-- Este arquivo foi gerado por introspecao do banco antigo (Lovable Cloud,
-- projeto nswkkhmqwqaqsqqseuqm), NAO pela soma das migrations anteriores.
-- Isso e proposital: o banco real divergiu dos arquivos em varios pontos
-- (delivery_type pickup/delivery e nao entrega/retirada; validate_product
-- existe so no banco; bucket product-images virou privado; admin_login_attempts
-- foi recriada com outras colunas). Rodar as migrations antigas em ordem
-- reproduziria um schema QUE NAO E o de producao.
--
-- Idempotente: pode rodar mais de uma vez sem quebrar.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occasions TEXT[] NOT NULL DEFAULT '{}'
);

-- ------------------------------------------------------------------ ORDERS
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1000;

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT ('BMQ-' || nextval('public.order_number_seq')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('pickup','delivery')),
  delivery_address JSONB,
  delivery_date DATE,
  delivery_time TEXT,
  payment_method TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  total NUMERIC(10,2) NOT NULL,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- SETTINGS
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------- ADMIN LOGIN RATE LIMITING
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_time
  ON public.admin_login_attempts (ip, attempted_at);

-- ------------------------------------------------------- ADMIN AUDIT LOG
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action TEXT NOT NULL,
  details JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON public.admin_audit_log (created_at DESC);

-- ----------------------------------------------------------------- TRIGGERS
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

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
  -- Forca valores seguros: o cliente nao escolhe status nem numero do pedido.
  NEW.status := 'pendente';
  NEW.order_number := 'BMQ-' || nextval('order_number_seq');

  IF NEW.items IS NULL OR jsonb_typeof(NEW.items) <> 'array' OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;
  IF jsonb_array_length(NEW.items) > 100 THEN
    RAISE EXCEPTION 'Too many items in order';
  END IF;

  -- Recalcula o total a partir dos itens: impede adulteracao pelo cliente.
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

  IF length(COALESCE(NEW.customer_name, '')) > 200
     OR length(COALESCE(NEW.customer_phone, '')) > 40
     OR length(COALESCE(NEW.customer_email, '')) > 200
     OR length(COALESCE(NEW.notes, '')) > 2000 THEN
    RAISE EXCEPTION 'Field length exceeds limit';
  END IF;

  IF NEW.delivery_type NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION 'Invalid delivery_type';
  END IF;
  IF NEW.payment_method NOT IN ('pix', 'dinheiro', 'cartao') THEN
    RAISE EXCEPTION 'Invalid payment_method';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_product()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NULL OR length(btrim(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Product name is required';
  END IF;
  IF length(NEW.name) > 150 THEN
    RAISE EXCEPTION 'Product name too long (max 150)';
  END IF;
  IF length(COALESCE(NEW.description,'')) > 2000 THEN
    RAISE EXCEPTION 'Product description too long (max 2000)';
  END IF;
  IF NEW.price IS NULL OR NEW.price < 0 OR NEW.price > 100000 THEN
    RAISE EXCEPTION 'Invalid product price (must be between 0 and 100000)';
  END IF;
  IF NEW.category NOT IN ('Rosas','Arranjos','Presentes','Plantas','Outros') THEN
    RAISE EXCEPTION 'Invalid category';
  END IF;
  IF NEW.image_url IS NOT NULL AND NEW.image_url <> '' AND NEW.image_url !~* '^https?://' THEN
    RAISE EXCEPTION 'Invalid image_url (must be http/https)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS validate_new_order_trigger ON public.orders;
CREATE TRIGGER validate_new_order_trigger BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_new_order();

DROP TRIGGER IF EXISTS validate_product_trigger ON public.products;
CREATE TRIGGER validate_product_trigger BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_product();

-- ------------------------------------------------- ADMIN AUTH (SECURITY DEFINER)
-- Verifica a senha COM rate limiting atomico por IP.
-- Retorna 'ok' | 'invalid' | 'locked'. Nunca retorna o hash.
CREATE OR REPLACE FUNCTION public.verify_admin_login(_password text, _ip text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored        text;
  ip_key        text := COALESCE(NULLIF(_ip, ''), 'unknown');
  window_start  timestamptz := now() - interval '15 minutes';
  fail_count    int;
  max_attempts  int := 8;
  ok            boolean;
BEGIN
  DELETE FROM public.admin_login_attempts WHERE attempted_at < now() - interval '1 hour';

  SELECT count(*) INTO fail_count
    FROM public.admin_login_attempts
    WHERE ip = ip_key AND attempted_at >= window_start;

  IF fail_count >= max_attempts THEN
    RETURN 'locked';
  END IF;

  SELECT value #>> '{}' INTO stored FROM public.settings WHERE key = 'admin_password';
  IF stored IS NULL THEN
    RETURN 'invalid';
  END IF;

  ok := (stored = crypt(_password, stored));

  IF ok THEN
    DELETE FROM public.admin_login_attempts WHERE ip = ip_key;
    RETURN 'ok';
  ELSE
    INSERT INTO public.admin_login_attempts(ip) VALUES (ip_key);
    RETURN 'invalid';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_admin_password(_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _new_password IS NULL OR length(_new_password) < 8 THEN
    RAISE EXCEPTION 'Password too short';
  END IF;
  UPDATE public.settings
    SET value = to_jsonb(crypt(_new_password, gen_salt('bf', 10))),
        updated_at = now()
    WHERE key = 'admin_password';
  IF NOT FOUND THEN
    INSERT INTO public.settings(key, value, is_public)
    VALUES ('admin_password', to_jsonb(crypt(_new_password, gen_salt('bf', 10))), false);
  END IF;
END;
$$;

-- NOTA: a funcao verify_admin_password(text) existe no banco antigo mas NAO e
-- recriada aqui de proposito. Ela e codigo morto e quebrado — referencia
-- colunas (succeeded, created_at) que nao existem mais em admin_login_attempts,
-- entao qualquer chamada falharia. A funcao viva e verify_admin_login acima.

-- ----------------------------------------------------------- AUDIT LOG API
CREATE OR REPLACE FUNCTION public.log_admin_action(_action TEXT, _details JSONB DEFAULT NULL, _ip TEXT DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (action, details, ip)
  VALUES (_action, _details, _ip);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_audit_log(_limit INT DEFAULT 100)
RETURNS SETOF public.admin_audit_log
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.admin_audit_log ORDER BY created_at DESC LIMIT _limit;
$$;

-- ------------------------------------------------------------------- RLS
ALTER TABLE public.products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT USING (active = true);

-- Pedidos nunca sao legiveis publicamente. O admin le via service_role,
-- que ignora RLS — por isso a policy pode ser sempre falsa.
DROP POLICY IF EXISTS "No public read of orders" ON public.orders;
CREATE POLICY "No public read of orders" ON public.orders
  FOR SELECT USING (false);

DROP POLICY IF EXISTS "Public can submit orders" ON public.orders;
CREATE POLICY "Public can submit orders" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pendente'
    AND total > 0
    AND jsonb_typeof(items) = 'array'
    AND jsonb_array_length(items) > 0
    AND delivery_type IN ('pickup','delivery')
    AND payment_method IN ('pix','dinheiro','cartao')
  );

DROP POLICY IF EXISTS "Public settings are readable" ON public.settings;
CREATE POLICY "Public settings are readable" ON public.settings
  FOR SELECT USING (is_public = true);

-- admin_login_attempts e admin_audit_log ficam SEM policy de proposito:
-- nenhuma role publica acessa; so service_role (que ignora RLS).

-- ---------------------------------------------------------------- GRANTS
REVOKE ALL ON public.products             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.orders               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.settings             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_login_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.admin_audit_log      FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT ON public.orders   TO anon, authenticated;
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT USAGE  ON SEQUENCE public.order_number_seq TO anon, authenticated;

GRANT ALL ON public.products             TO service_role;
GRANT ALL ON public.orders               TO service_role;
GRANT ALL ON public.settings             TO service_role;
GRANT ALL ON public.admin_login_attempts TO service_role;
GRANT ALL ON public.admin_audit_log      TO service_role;

-- Sem isto o checkout quebra por inteiro: o trigger validate_new_order chama
-- nextval('order_number_seq') e roda como quem inseriu — o service_role, que
-- e por onde createOrder grava. Um GRANT em `orders` nao cobre a sequencia.
GRANT ALL ON SEQUENCE public.order_number_seq TO service_role;

REVOKE ALL ON FUNCTION public.verify_admin_login(text, text)      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_admin_password(text)            FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_admin_action(TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_audit_log(INT)            FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.verify_admin_login(text, text)      TO service_role;
GRANT EXECUTE ON FUNCTION public.set_admin_password(text)            TO service_role;
GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_log(INT)            TO service_role;

-- --------------------------------------------------------------- STORAGE
-- Bucket PRIVADO: as imagens sao servidas por signed URL de curta duracao
-- (ver src/lib/storage.server.ts). Sem policy de leitura publica.
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;

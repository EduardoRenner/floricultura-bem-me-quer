-- Rate limit genérico por IP + "balde" (nome do endpoint). Mesmo padrão de
-- order_rate_limit/check_order_rate_limit, mas parametrizável para reusar em
-- mais de um lugar sem duplicar tabela/função a cada novo endpoint público.
--
-- Motivação: `getOrderForDeliveryConfirmation` e `confirmDelivery`
-- (src/lib/order.functions.ts) são endpoints públicos sem senha, e
-- `order_number` é sequencial e previsível ("BMQ-1000", "BMQ-1001", ...).
-- Sem limite, dava pra varrer números e coletar nome+endereço de cliente
-- (getOrderForDeliveryConfirmation), ou confirmar entregas falsas em massa
-- (confirmDelivery). Também cobre a sessão do admin (admin_session), como
-- segunda camada além da assinatura do token.
CREATE TABLE public.request_rate_limit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket TEXT NOT NULL,
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_request_rate_limit_bucket_ip_time ON public.request_rate_limit (bucket, ip, created_at);
ALTER TABLE public.request_rate_limit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_rate_limit FROM anon, authenticated;
GRANT ALL ON public.request_rate_limit TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_bucket text, _ip text, _max int, _window_minutes int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ip_key text := COALESCE(NULLIF(_ip, ''), 'unknown');
  window_start timestamptz := now() - make_interval(mins => _window_minutes);
  recent_count int;
BEGIN
  DELETE FROM public.request_rate_limit WHERE created_at < now() - interval '1 hour';

  SELECT count(*) INTO recent_count
    FROM public.request_rate_limit
    WHERE bucket = _bucket AND ip = ip_key AND created_at >= window_start;

  IF recent_count >= _max THEN
    RETURN false;
  END IF;

  INSERT INTO public.request_rate_limit(bucket, ip) VALUES (_bucket, ip_key);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, int, int) TO service_role;

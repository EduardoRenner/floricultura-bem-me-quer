-- Admin audit log (Etapa 5).
-- Registra acoes do admin (o que foi feito, quando, de onde) para rastreabilidade.
-- Mesmo padrao de seguranca das demais funcoes: sem grant para anon/authenticated,
-- so acessivel via funcao SECURITY DEFINER (chamada pela camada server, com service_role).

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action TEXT NOT NULL,
  details JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_audit_log FROM PUBLIC, anon, authenticated;

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

REVOKE ALL ON FUNCTION public.log_admin_action(TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, JSONB, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_audit_log(_limit INT DEFAULT 100)
RETURNS SETOF public.admin_audit_log
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.admin_audit_log ORDER BY created_at DESC LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.get_admin_audit_log(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_log(INT) TO service_role;

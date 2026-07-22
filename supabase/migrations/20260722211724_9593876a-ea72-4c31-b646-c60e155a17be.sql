DROP TABLE IF EXISTS public.admin_login_attempts;

CREATE TABLE public.admin_login_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_login_attempts_ip_time
  ON public.admin_login_attempts (ip, attempted_at);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_login_attempts FROM anon, authenticated;
GRANT ALL ON public.admin_login_attempts TO service_role;

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

REVOKE ALL ON FUNCTION public.verify_admin_login(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_login(text, text) TO service_role;
-- Rate limiting do login do admin (Etapa 4).
-- Estratégia: registrar apenas TENTATIVAS QUE FALHAM, por IP, numa janela de tempo.
-- Assim o admin legítimo (que acerta a senha) nunca é bloqueado, mesmo fazendo
-- muitas chamadas autenticadas — só quem erra a senha acumula bloqueio.

-- Tabela de tentativas falhas. Sem grants para anon/authenticated:
-- só é lida/escrita pela função SECURITY DEFINER abaixo (roda como service_role).
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_time
  ON public.admin_login_attempts (ip, attempted_at);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy => anon/authenticated não têm acesso. service_role ignora RLS.
REVOKE ALL ON public.admin_login_attempts FROM anon, authenticated;

-- Função que verifica a senha COM rate limiting atômico.
-- Retorna: 'ok' (senha correta), 'invalid' (senha errada) ou 'locked' (bloqueado).
-- Nunca retorna o hash. EXECUTE liberado apenas para service_role.
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
  max_attempts  int := 8;   -- 8 erros em 15 min => bloqueio temporário
  ok            boolean;
BEGIN
  -- Limpeza de registros antigos (mantém a tabela pequena)
  DELETE FROM public.admin_login_attempts WHERE attempted_at < now() - interval '1 hour';

  -- Conta falhas recentes deste IP
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
    -- Sucesso: zera as falhas deste IP
    DELETE FROM public.admin_login_attempts WHERE ip = ip_key;
    RETURN 'ok';
  ELSE
    -- Falha: registra a tentativa
    INSERT INTO public.admin_login_attempts(ip) VALUES (ip_key);
    RETURN 'invalid';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_login(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_login(text, text) TO service_role;

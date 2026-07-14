
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Replace stored plaintext with a bcrypt hash of the current password
UPDATE public.settings
SET value = to_jsonb(crypt(value #>> '{}', gen_salt('bf', 10)))
WHERE key = 'admin_password'
  AND (value #>> '{}') IS NOT NULL
  AND (value #>> '{}') NOT LIKE '$2%';

-- Security definer verifier: never returns the hash, just a boolean
CREATE OR REPLACE FUNCTION public.verify_admin_password(_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored text;
BEGIN
  SELECT value #>> '{}' INTO stored FROM public.settings WHERE key = 'admin_password';
  IF stored IS NULL THEN
    RETURN false;
  END IF;
  RETURN stored = crypt(_password, stored);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_password(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(text) TO service_role;

-- Setter that hashes new passwords server-side
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

REVOKE ALL ON FUNCTION public.set_admin_password(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_password(text) TO service_role;

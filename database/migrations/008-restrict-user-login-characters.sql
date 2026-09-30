-- Executar uma vez no SQL Editor do Supabase.
-- Restringe logins a letras ASCII minúsculas, números, sublinhado e ponto.
BEGIN;

DO $$
DECLARE invalid_logins text;
BEGIN
  SELECT string_agg(format('%s (id %s)', login, id), '; ' ORDER BY login)
  INTO invalid_logins
  FROM public.usuarios
  WHERE login !~ '^[a-z0-9_.]{3,50}$';

  IF invalid_logins IS NOT NULL THEN
    RAISE EXCEPTION 'Há logins fora do padrão permitido: %. Corrija-os manualmente para conter apenas letras sem acento, números, _ e ., entre 3 e 50 caracteres, e execute novamente.', invalid_logins;
  END IF;
END $$;

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_login_normalized_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_login_normalized_check
  CHECK (login ~ '^[a-z0-9_.]{3,50}$');

COMMIT;

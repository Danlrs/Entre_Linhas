-- Executar uma vez no SQL Editor do Supabase antes de publicar o backend.
-- Preserva logins existentes normalizando para minúsculas e removendo espaços.
BEGIN;
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS nome varchar(100);

UPDATE public.usuarios
SET nome = COALESCE(NULLIF(btrim(nome), ''), btrim(login))
WHERE nome IS NULL OR btrim(nome) = '';

DO $$
DECLARE collisions text;
DECLARE invalid_logins text;
BEGIN
  SELECT string_agg(format('%s (%s)', normalized_login, originals), '; ')
  INTO collisions
  FROM (
    SELECT lower(regexp_replace(btrim(login), '[[:space:]]+', '', 'g')) AS normalized_login,
           string_agg(login, ', ' ORDER BY login) AS originals
    FROM public.usuarios
    GROUP BY lower(regexp_replace(btrim(login), '[[:space:]]+', '', 'g'))
    HAVING count(*) > 1
  ) duplicate_logins;

  IF collisions IS NOT NULL THEN
    RAISE EXCEPTION 'Não foi possível normalizar logins duplicados: %. Altere esses logins manualmente e execute novamente.', collisions;
  END IF;

  SELECT string_agg(login, ', ' ORDER BY login)
  INTO invalid_logins
  FROM public.usuarios
  WHERE length(lower(regexp_replace(btrim(login), '[[:space:]]+', '', 'g'))) < 3;

  IF invalid_logins IS NOT NULL THEN
    RAISE EXCEPTION 'Estes logins ficariam com menos de 3 caracteres: %. Corrija-os e execute novamente.', invalid_logins;
  END IF;
END $$;

UPDATE public.usuarios
SET login = lower(regexp_replace(btrim(login), '[[:space:]]+', '', 'g'));

ALTER TABLE public.usuarios ALTER COLUMN nome SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_login_lower_unique ON public.usuarios (lower(login));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_login_normalized_check') THEN
    ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_login_normalized_check
      CHECK (login = lower(login) AND login !~ '[[:space:]]' AND length(login) BETWEEN 3 AND 50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_nome_not_blank_check') THEN
    ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_nome_not_blank_check CHECK (btrim(nome) <> '');
  END IF;
END $$;

COMMIT;

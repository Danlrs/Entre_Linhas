-- ============================================================
-- Migration 004 — Refresh tokens stored server-side for rotation/revoke
--
-- PowerShell (raiz do projeto):
--   Get-Content database\migrations\004-refresh-tokens.sql `
--     | docker compose exec -T db psql -U entrelinhas -d entrelinhas_db
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_exp ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

COMMIT;

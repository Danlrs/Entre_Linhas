-- Executar antes de publicar a recuperação de senha. Pode ser reexecutada.
BEGIN;
CREATE TABLE IF NOT EXISTS password_resets (
    usuario_id INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_snapshot VARCHAR(255) NOT NULL,
    code_hash VARCHAR(64),
    token_hash VARCHAR(64),
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    last_requested_at TIMESTAMPTZ NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS password_resets_token_unique ON password_resets(token_hash);
-- Usada apenas pela conexão privada do NestJS. Nunca expor hashes pela Data API.
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE password_resets FROM anon, authenticated;
COMMIT;

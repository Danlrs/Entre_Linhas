-- ============================================================
--  Migration 002 — Quantidade de estampas e materiais informativos
--  • Adiciona produtos.quantidade_estampas (default 1).
--  • Remove materiais.valor_adicional (materiais agora são apenas
--    informações descritivas do produto, não somam preço).
--
--  Aplicação (PowerShell, da raiz do projeto):
--    Get-Content database\migrations\002-quantidade-estampas.sql `
--      | docker compose exec -T db psql -U entrelinhas -d entrelinhas_db
-- ============================================================

BEGIN;

ALTER TABLE produtos
    ADD COLUMN IF NOT EXISTS quantidade_estampas INTEGER NOT NULL DEFAULT 1;

ALTER TABLE materiais
    DROP COLUMN IF EXISTS valor_adicional;

COMMIT;

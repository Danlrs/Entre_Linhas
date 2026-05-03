-- ============================================================
--  Migration 001 — Variações de produto
--  Aplique este arquivo no banco existente para adicionar:
--   • valor_adicional em estampas e materiais
--   • Tabela produto_tamanhos com preço, medidas e estoque por tamanho
--   • Remove o campo legado tamanhos_disponiveis dos produtos
--
--  Como aplicar (psql):
--    docker compose exec postgres psql -U <user> -d <database> -f /docker-entrypoint-initdb.d/migrations/001-product-variations.sql
--  ou copie e cole o conteúdo no seu cliente SQL preferido.
-- ============================================================

BEGIN;

ALTER TABLE estampas
    ADD COLUMN IF NOT EXISTS valor_adicional DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE materiais
    ADD COLUMN IF NOT EXISTS valor_adicional DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

CREATE TABLE IF NOT EXISTS produto_tamanhos (
    id            SERIAL PRIMARY KEY,
    produto_id    INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
    nome          VARCHAR(50)    NOT NULL,
    preco         DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    profundidade  DECIMAL(10, 2),
    comprimento   DECIMAL(10, 2),
    largura       DECIMAL(10, 2),
    estoque       INTEGER,
    ativo         BOOLEAN DEFAULT TRUE,
    ordem         INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_produto_tamanhos_produto ON produto_tamanhos(produto_id);

ALTER TABLE produtos
    DROP COLUMN IF EXISTS tamanhos_disponiveis;

COMMIT;

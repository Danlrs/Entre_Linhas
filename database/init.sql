-- ============================================================
--  EntreLinhas - Schema do Banco de Dados PostgreSQL
-- ============================================================

-- Extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
--  1. Tabela de Usuários
-- ============================================================
CREATE TABLE usuarios (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    login         VARCHAR(50)  UNIQUE NOT NULL,
    senha         VARCHAR(255)        NOT NULL,
    telefone      VARCHAR(20)  UNIQUE,
    data_criacao  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessões de refresh token (rotação e logout)
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ NULL
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX idx_refresh_tokens_exp ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

-- ============================================================
--  2. Tabela de Categorias
-- ============================================================
CREATE TABLE categorias (
    id    SERIAL PRIMARY KEY,
    nome  VARCHAR(100) NOT NULL
);

-- ============================================================
--  3. Tabela de Materiais (ex: Zíper, Tecido Tricoline, Acolchoado)
--  Materiais são apenas descritivos do que compõe o produto.
-- ============================================================
CREATE TABLE materiais (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    tipo        VARCHAR(50),
    imagem_url  TEXT
);

-- ============================================================
--  4. Tabela de Estampas
--  valor_adicional é somado ao preço final quando o cliente escolhe essa estampa.
-- ============================================================
CREATE TABLE estampas (
    id               SERIAL PRIMARY KEY,
    nome             VARCHAR(100)   NOT NULL,
    imagem_url       TEXT,
    valor_adicional  DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

-- ============================================================
--  5. Tabela de Produtos
--  preco aqui funciona como preço base/fallback quando o produto
--  não possui tamanhos cadastrados.
--  quantidade_estampas indica quantas estampas o cliente deve
--  escolher ao comprar este produto.
-- ============================================================
CREATE TABLE produtos (
    id                   SERIAL PRIMARY KEY,
    categoria_id         INTEGER REFERENCES categorias(id),
    nome                 VARCHAR(150) NOT NULL,
    descricao            TEXT,
    preco                DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    quantidade_estampas  INTEGER NOT NULL DEFAULT 1,
    imagem_url           TEXT,
    ativo                BOOLEAN DEFAULT TRUE,
    data_cadastro        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  6. Tabela de Imagens do Produto (múltiplas imagens por produto)
-- ============================================================
CREATE TABLE imagens_produto (
    id          SERIAL PRIMARY KEY,
    produto_id  INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
    url         TEXT    NOT NULL,
    principal   BOOLEAN DEFAULT FALSE,
    ordem       INTEGER DEFAULT 0
);

-- ============================================================
--  7. Tabela de Tamanhos do Produto (variações de tamanho/preço)
--  Cada tamanho tem seu próprio preço, medidas (cm) e estoque.
-- ============================================================
CREATE TABLE produto_tamanhos (
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

-- ============================================================
--  Tabelas de Relacionamento N:N
-- ============================================================

CREATE TABLE produto_estampas (
    produto_id  INTEGER REFERENCES produtos(id)  ON DELETE CASCADE,
    estampa_id  INTEGER REFERENCES estampas(id)  ON DELETE CASCADE,
    PRIMARY KEY (produto_id, estampa_id)
);

CREATE TABLE produto_materiais (
    produto_id  INTEGER REFERENCES produtos(id)  ON DELETE CASCADE,
    material_id INTEGER REFERENCES materiais(id) ON DELETE CASCADE,
    PRIMARY KEY (produto_id, material_id)
);

-- ============================================================
--  Índices para performance
-- ============================================================
CREATE INDEX idx_produtos_categoria        ON produtos(categoria_id);
CREATE INDEX idx_imagens_produto           ON imagens_produto(produto_id);
CREATE INDEX idx_produto_tamanhos_produto  ON produto_tamanhos(produto_id);

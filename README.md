# Entre Linhas

[English](#english) · [Português (Brasil)](#português-brasil)

---

## English

### What this project is

**Entre Linhas** is a full-stack web application for a small textile / handmade goods business. It combines a **public storefront** (product catalog, sizes, optional stamp choices, WhatsApp checkout flow) with an **admin area** to manage categories, materials, stamps, products, and images.

The goal is a single codebase you can run locally with Docker, then deploy with a managed PostgreSQL database (e.g. Supabase), a Node API (e.g. Render), and a static Angular front end (e.g. Vercel).

### Tech stack

| Layer | Technology |
|-------|------------|
| API | [NestJS](https://nestjs.com/) 11, TypeORM, PostgreSQL |
| Web UI | [Angular](https://angular.dev/) 21, Tailwind CSS |
| Shared types | `shared/` (TypeScript interfaces used by both sides) |
| DB schema & migrations | `database/` (`init.sql`, numbered SQL migrations) |
| Container (optional) | Docker Compose (Postgres + optional app services) |

### Repository layout

```
backend/     NestJS API (REST under /api)
frontend/    Angular SPA
database/    PostgreSQL schema and migrations
shared/      Shared TypeScript interfaces
```

### Local development

1. **Environment**  
   Copy `.env.example` to `.env` at the repo root and fill in database and JWT values (see comments inside `.env.example`).

2. **Database**  
   Start Postgres (e.g. `docker compose up -d db`) or point `DB_*` in `.env` to your instance. Apply schema: run `database/init.sql` (and any `database/migrations/*.sql` you need) against your database.

3. **Backend** (from `backend/`)

   ```bash
   npm install
   npm run start:dev
   ```

   Uses `dotenv-cli` to load `../.env`. API base path: `/api`.

4. **Frontend** (from `frontend/`)

   ```bash
   npm install
   npm start
   ```

   Default dev URL: `http://localhost:4200`. API URL is read from `frontend/src/environments/environment.ts`.

### Production-oriented features (backend)

- Environment validation at boot (**Zod**)
- **JWT** access + refresh tokens, logout, server-side refresh token rows
- **CORS** allowlist via `CORS_ORIGINS`
- **Rate limiting** (`@nestjs/throttler`) on auth and uploads
- **Structured logging** (Pino) and optional **Sentry**
- **Image uploads**: validated MIME + magic bytes; optional **Supabase Storage** (public URLs stored in Postgres); otherwise local `./uploads` served by Nest

See `.env.example` for variable names (`SUPABASE_*`, `DB_SSL`, throttles, etc.).

### Deploy (short checklist)

1. Create **Supabase** project → run SQL from `database/` → create **Storage** bucket (public read if you use public image URLs).
2. Deploy **backend** (Dockerfile in `backend/`) with secrets matching `.env.example`.
3. Set **`frontend/src/environments/environment.prod.ts`** `apiUrl` to your API HTTPS URL, then deploy **frontend** (production build uses file replacement for that file).

Order: **database → API → front**, then set **`CORS_ORIGINS`** on the API to your front-end origin.

### License

Private / UNLICENSED (see `backend/package.json`). Adjust if you open-source the repo.

---

## Português (Brasil)

### O que é este projeto

**Entre Linhas** é uma aplicação web full-stack para um negócio de **artesanato / produtos têxteis**. Há uma **vitrine pública** (catálogo, tamanhos, escolha de estampas quando o produto exige, fluxo de compra com **WhatsApp**) e uma **área administrativa** para cadastrar categorias, materiais, estampas, produtos e imagens.

A ideia é rodar tudo localmente com Docker e, em produção, usar PostgreSQL gerenciado (ex.: **Supabase**), API Node (ex.: **Render**) e front Angular estático (ex.: **Vercel**).

### Stack técnica

| Camada | Tecnologia |
|--------|------------|
| API | NestJS 11, TypeORM, PostgreSQL |
| Interface | Angular 21, Tailwind CSS |
| Tipos compartilhados | Pasta `shared/` |
| Banco | `database/` (`init.sql` + migrações SQL numeradas) |
| Docker (opcional) | `docker-compose.yml` (Postgres e serviços opcionais) |

### Estrutura do repositório

```
backend/     API NestJS (REST sob /api)
frontend/    SPA Angular
database/    Esquema PostgreSQL e migrações
shared/      Interfaces TypeScript compartilhadas
```

### Desenvolvimento local

1. **Ambiente**  
   Copie `.env.example` para `.env` na raiz e preencha banco e JWT (comentários dentro do `.env.example` guiam os campos).

2. **Banco**  
   Suba o Postgres (`docker compose up -d db`) ou aponte `DB_*` no `.env`. Aplique o esquema: execute `database/init.sql` (e as migrações em `database/migrations/` que precisar) no banco.

3. **Backend** (pasta `backend/`)

   ```bash
   npm install
   npm run start:dev
   ```

   Carrega `../.env` via `dotenv-cli`. Prefixo global da API: `/api`.

4. **Frontend** (pasta `frontend/`)

   ```bash
   npm install
   npm start
   ```

   URL padrão: `http://localhost:4200`. A URL da API vem de `frontend/src/environments/environment.ts`.

### Recursos voltados à produção (backend)

- Validação de variáveis de ambiente no boot (**Zod**)
- **JWT** de acesso + refresh, logout, linhas em `refresh_tokens`
- **CORS** restrito via `CORS_ORIGINS`
- **Rate limit** (`@nestjs/throttler`) em login e uploads
- **Logs estruturados** (Pino) e **Sentry** opcional
- **Upload de imagens**: validação de MIME + assinatura; opcionalmente **Supabase Storage** (URLs públicas gravadas no Postgres); senão `./uploads` servido pelo Nest

Detalhes dos nomes das variáveis: `.env.example` (`SUPABASE_*`, `DB_SSL`, throttles, etc.).

### Deploy (ordem sugerida)

1. **Supabase**: criar projeto → rodar SQL de `database/` → criar bucket no **Storage** (leitura pública se usar URLs públicas de imagem).
2. **Backend** (Dockerfile em `backend/`): secrets alinhados ao `.env.example`.
3. **Frontend**: ajustar `apiUrl` em `frontend/src/environments/environment.prod.ts` para a URL HTTPS da API e fazer o deploy do build de produção.

Ordem prática: **banco → API → front**; depois configure **`CORS_ORIGINS`** na API com a origem exata do front (Vercel ou domínio próprio).

### Licença

Projeto privado / UNLICENSED (veja `backend/package.json`). Altere se for tornar o repositório open source.

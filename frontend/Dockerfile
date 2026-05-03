# ─── Stage 1: Build ───────────────────────────────────────────
# Contexto de build é a raiz do projeto (para acessar shared/)
FROM node:20-alpine AS builder

WORKDIR /project

# Instala dependências do frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copia o frontend e o shared (necessário para os imports TypeScript)
COPY frontend/ ./frontend/
COPY shared/ ./shared/

WORKDIR /project/frontend
RUN npm run build

# ─── Stage 2: Serve com Nginx ─────────────────────────────────
FROM nginx:alpine AS production

COPY --from=builder /project/frontend/dist/frontend/browser /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

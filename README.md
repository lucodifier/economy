<div align="center">

# 💰 Minhas Economias

**Controle financeiro pessoal self-hosted: contas, transações, categorias, assinaturas e alertas no Discord.**

[![CI](https://github.com/lucodifier/economy/actions/workflows/ci.yml/badge.svg)](https://github.com/lucodifier/economy/actions/workflows/ci.yml)
![NestJS](https://img.shields.io/badge/API-NestJS-e0234e)
![Next.js](https://img.shields.io/badge/Web-Next.js-000)
![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-336791)
![Docker](https://img.shields.io/badge/Docker-ready-2496ed)

[Landing page](https://lucodifier.github.io/economy/) · [Como rodar](#-início-rápido-docker) · [Desenvolvimento](#-desenvolvimento-local)

</div>

> 📸 Prints: coloque suas imagens em [`docs/screenshots`](docs/screenshots) e referencie aqui.

## ✨ Funcionalidades

- **Contas, categorias e transações** (despesa, receita, transferência)
- **Assinaturas** recorrentes com visão dos próximos vencimentos
- **Importação** de CSV/XLS/XLSX (cabeçalhos PT/EN) com pré-visualização
- **Exportação** por período em CSV ou XLSX
- **Alertas no Discord** (itens em atraso, assinaturas) e **webhooks**
- Login com **Google** (OAuth), dados isolados por usuário
- Seus dados ficam **no seu servidor** (Postgres em volume Docker)

## 🧱 Arquitetura

| Camada | Tecnologia |
| --- | --- |
| Web | Next.js (App Router), Tailwind, NextAuth (Google) |
| API | NestJS, Prisma, Zod, auth via Google ID Token |
| Banco | PostgreSQL 16 |
| Entrega | Docker Compose (db + api + web) |

```
apps/
  api/   NestJS + Prisma (migrations em apps/api/prisma)
  web/   Next.js
samples/ modelos de importação (CSV/XLSX)
```

## 🐳 Início rápido (Docker)

Pré-requisitos: Docker e uma credencial OAuth do Google.

1. **Crie as credenciais Google** no [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → *ID do cliente OAuth* (aplicativo da Web):
   - Origem JS autorizada: `http://localhost:5176`
   - URI de redirecionamento: `http://localhost:5176/api/auth/callback/google`
2. **Configure o ambiente**:
   ```bash
   git clone https://github.com/lucodifier/economy.git
   cd economy
   cp .env.example .env     # preencha senha do banco, NEXTAUTH_SECRET e chaves Google
   ```
   Gere o segredo com `openssl rand -base64 32`.
3. **Suba tudo**:
   ```bash
   docker compose up -d --build
   ```
4. Acesse **http://localhost:5176**.

### Como o banco é criado

O container da API executa `prisma migrate deploy` ao iniciar: o schema é criado/atualizado automaticamente no Postgres do compose. Os dados persistem no volume `pgdata`.

```bash
docker compose down        # para (mantém dados)
docker compose down -v     # para e APAGA o banco
docker compose exec db pg_dump -U myeconomy myeconomy > backup.sql   # backup
```

### Usando um Postgres existente

Remova o serviço `db` do compose e ajuste `DATABASE_URL` da API para o seu servidor.

### Publicando na internet

Defina `WEB_URL` e `PUBLIC_API_URL` no `.env` com seus domínios (HTTPS atrás de um proxy reverso) e cadastre-os no console Google.

## 🛠 Desenvolvimento local

Requisitos: Node 20+, npm 9+, Postgres.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm ci
npm run db:generate
npm run db:migrate    # cria o schema (prisma migrate dev)
npm run dev           # API :3001 + Web :3000
```

## 📥 Importar / exportar

- `POST /import?accountId=...` (multipart, campo `file`) · `POST /import/preview`
- `GET /export?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv|xlsx&accountId=...`
- Modelos: [`samples/import_template.csv`](samples/import_template.csv) e [`.xlsx`](samples/import_template.xlsx)

Dica: aponte a pasta onde você salva seus exports/backups para dentro do **Google Drive** (ou outro serviço de sync) e ela fica sincronizada automaticamente.

## 🔒 Segurança

Nunca commite `.env`. Credenciais Google e senhas vêm só de variáveis de ambiente. Ao expor o app publicamente, use HTTPS e senhas fortes.

## 📦 Download

A cada tag `v*` o GitHub Actions publica as imagens no GitHub Container Registry (`ghcr.io/lucodifier/myeconomy-api` e `myeconomy-web`) e anexa o `myeconomy-docker.zip` (compose + `.env.example`) em [Releases](https://github.com/lucodifier/economy/releases).

## 📄 Licença

MIT © Luciano Rieth

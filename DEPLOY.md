# Trampei — Deploy

Guia objetivo pra subir o **app interno** (React + Express + tRPC) em produção. A landing standalone em `landing/` é HTML estático e vai em qualquer CDN (Vercel/Netlify/Cloudflare Pages) sem build.

## Variáveis de ambiente

Veja [`.env.example`](.env.example) — copie pra `.env` ou configure como secrets na sua plataforma.

| Variável | Quando lê | Obrigatório |
|---|---|---|
| `DATABASE_URL` | runtime | ✅ |
| `VITE_OAUTH_PORTAL_URL` | **build** (bake no client) | ✅ |
| `VITE_APP_ID` | **build** (bake no client) | ✅ |
| `OAUTH_SERVER_URL` | runtime | ✅ |
| `JWT_SECRET` | runtime | ✅ (64 chars random) |
| `BUILT_IN_FORGE_API_URL` | runtime | só pra upload S3 |
| `BUILT_IN_FORGE_API_KEY` | runtime | só pra upload S3 |
| `OWNER_OPEN_ID` | runtime | opcional (auto-admin no 1º login) |
| `PORT` | runtime | opcional (default 3000) |

⚠️ **As `VITE_*` são embutidas no JS do client no momento do build.** Se você trocar o `VITE_APP_ID`, precisa rebuildar.

## Opção 1 — Docker Compose local (recomendado pra testar)

Sobe MySQL + app numa stack só. Bom pra validar build de produção antes de mandar pra cloud.

```bash
# 1. Configure as VITE_* no shell ou .env (build args do compose)
export VITE_OAUTH_PORTAL_URL=https://oauth.manus.computer
export VITE_APP_ID=seu-app-id

# 2. Sobe a stack
docker compose up --build

# 3. Em outro terminal, aplica as migrations
docker compose exec app pnpm db:push
```

Abre http://localhost:3000.

Pra desligar: `docker compose down` (mantém o volume); `docker compose down -v` apaga o banco.

## Opção 2 — Docker standalone

Se sua plataforma só aceita uma imagem (não compose):

```bash
# Build
docker build \
  --build-arg VITE_OAUTH_PORTAL_URL=https://oauth.manus.computer \
  --build-arg VITE_APP_ID=seu-app-id \
  -t trampei:latest .

# Run (apontando pro seu MySQL externo)
docker run -p 3000:3000 \
  -e DATABASE_URL=mysql://user:pass@db.exemplo.com:3306/trampei \
  -e OAUTH_SERVER_URL=https://oauth.manus.computer \
  -e JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" \
  -e BUILT_IN_FORGE_API_URL=https://forge.manus.computer \
  -e BUILT_IN_FORGE_API_KEY=seu-forge-key \
  trampei:latest
```

## Opção 3 — Railway / Render / Fly.io

Plataformas que aceitam Dockerfile direto:

1. Conecte o repo Git
2. Configure os build args:
   - `VITE_OAUTH_PORTAL_URL`
   - `VITE_APP_ID`
3. Configure os env vars de runtime (`DATABASE_URL`, `JWT_SECRET`, `OAUTH_SERVER_URL`, `BUILT_IN_FORGE_*`)
4. Adicione um plugin de **MySQL 8** e ligue ao app (a plataforma popula `DATABASE_URL` automaticamente em Railway/Render)
5. Após o primeiro deploy, rode `pnpm db:push` via console pra criar as tabelas

**Healthcheck**: `/api/health` retorna `{ok:true,uptime:...}` — configure como liveness probe se a plataforma pedir.

## Opção 4 — Vercel / Netlify (não recomendado)

Esses são otimizados pra frontend serverless. Esse app é Express monolítico + WebSocket-friendly + Vite dev middleware — não cabe bem nesses runtimes sem refatoração serverless do tRPC. Use uma das opções acima.

## Banco de dados

A primeira vez precisa criar as tabelas:

```bash
# Local (com DATABASE_URL setado no .env)
pnpm db:push

# Docker compose
docker compose exec app pnpm db:push

# Plataforma com console
# (na shell do container) pnpm db:push
```

`drizzle-kit generate && drizzle-kit migrate` aplica todas as migrations em `drizzle/` em sequência. Idempotente.

## Pós-deploy — checklist

- [ ] `https://seu-dominio.com/api/health` retorna `{ok:true}`
- [ ] Login OAuth funciona (redireciona pro `VITE_OAUTH_PORTAL_URL` e volta com sessão)
- [ ] Worker consegue criar perfil + ver search (com demo workers OFF — só em dev)
- [ ] Client consegue criar solicitação
- [ ] Upload de foto funciona (precisa `BUILT_IN_FORGE_*`)
- [ ] Admin role pode acessar `/admin` e ver indicações cross-trampista
- [ ] HTTPS configurado (Let's Encrypt via plataforma)
- [ ] Backup automático do MySQL ligado

## Logs e observabilidade

O server printa pro stdout via `console.log` — sua plataforma deve capturar. Pra produção séria, considere:
- Sentry / Bugsnag pra erros frontend e backend
- DataDog / New Relic pra APM
- Estruturar logs com `pino` ou `winston`

## Rollback

Imagens Docker são imutáveis; basta apontar pra tag anterior:

```bash
docker run trampei:v0.9.0  # versão estável anterior
```

Schema migrations são forward-only no Drizzle. Reverter requer migration nova compensando a mudança.

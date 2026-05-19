# Trampei — Deploy

Guia objetivo pra subir o **app interno** (React + Express + tRPC) em produção usando **GitHub + Supabase (Postgres) + plataforma de deploy** (Railway/Render/Fly.io).

A **landing standalone** em `landing/index.html` é HTML estático e vai em qualquer CDN (Vercel/Netlify/Cloudflare Pages) sem build.

---

## Variáveis de ambiente

Veja [`.env.example`](.env.example) — copie pra `.env` ou configure como secrets na sua plataforma.

| Variável | Quando lê | Obrigatório | Exemplo |
|---|---|---|---|
| `DATABASE_URL` | runtime | ✅ | `postgresql://postgres.xxx:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres` |
| `VITE_OAUTH_PORTAL_URL` | **build** (bake no client) | ✅ | `https://oauth.manus.computer` |
| `VITE_APP_ID` | **build** (bake no client) | ✅ | `trampei-prod` |
| `OAUTH_SERVER_URL` | runtime | ✅ | igual ao `VITE_OAUTH_PORTAL_URL` |
| `JWT_SECRET` | runtime | ✅ (64 chars random) | gere com `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `BUILT_IN_FORGE_API_URL` | runtime | só pra upload S3 real | URL do Forge da Manus |
| `BUILT_IN_FORGE_API_KEY` | runtime | só pra upload S3 real | token do Forge |
| `OWNER_OPEN_ID` | runtime | opcional | openId Manus do dono → vira admin no 1º login |
| `PORT` | runtime | opcional | default 3000 |

⚠️ **As `VITE_*` são embutidas no JS do client no momento do build.** Se você trocar o `VITE_APP_ID`, precisa rebuildar.

⚠️ **Pgbouncer da Supabase** (porta `6543`, modo `transaction`) não aceita prepared statements. O driver `postgres-js` já está configurado com `prepare: false` em [`server/db.ts`](server/db.ts:38) — não mexer.

---

## 1. Subir no GitHub

Já temos o repo iniciado com 1 commit (`master` → `main`). Falta criar o remote e fazer push.

```bash
# 1. Cria repo vazio em https://github.com/new (privado ou público, sem README)
# 2. Conecta o local ao remote
git remote add origin https://github.com/SEU_USER/trampei.git

# 3. Push inicial
git push -u origin main
```

Alternativa via GitHub CLI:

```bash
gh repo create trampei --private --source=. --remote=origin --push
```

A partir daí, cada `git push` atualiza o repo. Plataformas de deploy (Railway, Render, Vercel) podem ouvir o webhook e fazer auto-deploy a cada push em `main`.

---

## 2. Provisionar banco no Supabase

1. Cria conta + projeto em https://supabase.com/dashboard/projects
2. Escolhe a região mais perto do seu público (pra Brasil: **South America (São Paulo)** — `sa-east-1`)
3. Espera 1-2 min provisionar
4. Vai em **Project Settings → Database → Connection string**
5. Copia a **Connection pooling** string (não a Direct connection) — formato:
   ```
   postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```
6. Substitui `[YOUR-PASSWORD]` pela senha que você definiu na criação do projeto
7. Salva como `DATABASE_URL`

**Por que pooler e não direct?** O pooler suporta muitas conexões concorrentes (essencial em serverless). A direct connection é só pra migrations/admin local.

---

## 3. Aplicar schema no Supabase

Local, com `DATABASE_URL` apontando pro pooler:

```bash
# Aplica todas as migrations em drizzle/*.sql
DATABASE_URL="postgresql://..." pnpm db:push
```

Isso roda `drizzle-kit generate && drizzle-kit migrate`:
- Cria os 11 tipos `enum` (`user_role`, `service_status`, etc.)
- Cria as 11 tabelas (`users`, `worker_profiles`, `client_profiles`, `specialties`, `service_requests`, `reviews`, `referrals`, `disputes`, `notifications`, `availability`, `service_history`)

Verifica no dashboard Supabase **Database → Tables** — deve aparecer todas.

📦 **Migrations legadas**: o diretório `drizzle/legacy-mysql/` tem as migrations antigas em MySQL (referência histórica). Não tente aplicar — só estão lá pra histórico do que o schema MySQL era antes do port.

---

## 4. Deploy do app

### Opção A — Railway (recomendado pra MVP)

Mais simples; já tem Dockerfile pronto + auto-deploy via GitHub.

1. Conecta repo em https://railway.app/new
2. Configure os **build args**:
   - `VITE_OAUTH_PORTAL_URL`
   - `VITE_APP_ID`
3. Configure os **runtime env vars**:
   - `DATABASE_URL` (do Supabase, passo 2)
   - `JWT_SECRET` (random 64-char)
   - `OAUTH_SERVER_URL`
   - `BUILT_IN_FORGE_*` (se for usar upload S3)
4. Deploy. Em 2-3 min sua URL `seu-app.up.railway.app` tá no ar.

### Opção B — Render

Similar ao Railway. https://dashboard.render.com/select-repo → escolhe Web Service → Dockerfile.

### Opção C — Fly.io

```bash
fly launch  # detecta Dockerfile automaticamente
fly secrets set DATABASE_URL="..." JWT_SECRET="..." OAUTH_SERVER_URL="..."
fly deploy
```

### Opção D — Vercel / Netlify

❌ **Não recomendado.** Esse app é Express monolítico + Vite dev middleware. Não cabe bem em runtimes serverless sem refatoração tRPC pra edge functions.

Use Vercel só pra hospedar a landing standalone em `landing/`.

### Opção E — Docker compose local (validação)

```bash
docker compose up --build
docker compose exec app pnpm db:push
```

Sobe Postgres + app numa stack só. Bom pra testar build de produção antes de mandar pra cloud.

---

## 5. Domínio + HTTPS

1. Compra `trampei.com.br` no Registro.br ou Hostinger
2. Na plataforma (Railway/Render/Fly), vai em **Settings → Custom Domains → Add**
3. Configura DNS no Registro.br seguindo as instruções da plataforma:
   - Geralmente um `CNAME` apontando pro hostname interno
   - Ou registros `A` apontando pros IPs
4. HTTPS é automático via Let's Encrypt — espera ~5 min pra emitir o cert

---

## 6. Pós-deploy — checklist

- [ ] `https://trampei.com.br/api/health` retorna `{ok:true}`
- [ ] Login OAuth funciona (redireciona pro `VITE_OAUTH_PORTAL_URL` e volta com sessão)
- [ ] Worker consegue criar perfil + ver search (sem DevPanel — `import.meta.env.DEV` é falso em prod)
- [ ] Client consegue criar solicitação
- [ ] Notificação `new_request_match` chega pro trampista (cheque no sininho)
- [ ] Admin acessa `/admin` e vê indicações + disputas cross-trampista
- [ ] Página pública `/trampista/:id` ou `/curriculo/:id` carrega sem auth
- [ ] LGPD: `/account` → "Baixar JSON" retorna arquivo válido
- [ ] Upload de foto (precisa `BUILT_IN_FORGE_*`) — sem, cai pra fallback data URL
- [ ] HTTPS funcionando (sem warning de cert)
- [ ] **Backup automático do Postgres** — Supabase free tier tem backup diário automático (Pro tem PITR); confirme em **Database → Backups**

---

## Logs e observabilidade

O server printa pro stdout via `console.log` — sua plataforma deve capturar. Pra produção séria, adicione:

- **Sentry** pra erros frontend e backend
- **DataDog / New Relic** pra APM
- Estruturar logs com `pino` ou `winston` (substituir `console.log`)
- Supabase tem dashboard de queries lentas em **Database → Query Performance**

---

## Rollback

### App
Imagens Docker imutáveis. Aponte pra tag anterior:

```bash
docker run trampei:v0.9.0  # versão estável anterior
```

Em Railway/Render: dashboard tem botão **"Redeploy previous version"**.

### Schema
Drizzle migrations são forward-only. Reverter requer migration nova compensando a mudança. Antes de operações destrutivas em prod, use o **branch** feature do Supabase pra testar a migration num clone do banco.

---

## Troubleshooting

**"prepared statement does not exist"** — você esqueceu `prepare: false` no driver postgres-js. Confira [`server/db.ts`](server/db.ts).

**"too many connections"** — está usando a Direct connection do Supabase em vez do pooler. Troque pra porta `6543`.

**Tabelas não aparecem após `pnpm db:push`** — confira se `drizzle.config.ts` aponta pra `./drizzle` (não `./drizzle/legacy-mysql`).

**OAuth não redireciona** — `VITE_OAUTH_PORTAL_URL` precisa bater EXATAMENTE com `OAUTH_SERVER_URL`. Cheque também se o `VITE_APP_ID` está registrado no portal Manus.

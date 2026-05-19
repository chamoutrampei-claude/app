# 🚀 Como subir a TRAMPEI no ar

**Para quem nunca fez isso antes.** Sem jargão. Cada passo tem o tempo estimado e o que você deve ver depois.

**Tempo total:** 30-45 min (a maior parte é esperando coisa carregar).

**Você vai precisar de:**
- ✉️ Um email (de preferência o mesmo em todas as contas)
- 💳 **Nenhum cartão obrigatório** — todos os planos gratuitos que vou usar bastam pra começar
- 💻 O computador que você já usa pra desenvolver

---

## Antes de começar — checklist rápido

Abre o terminal (PowerShell no Windows, Terminal no Mac) e roda esses 2 comandos. Se os dois mostrarem um número de versão, **pula direto pro Passo 1**.

```bash
git --version
node --version
```

**Se algum não funcionar:**

- **Git não instalado?** Baixa em https://git-scm.com/download/win (Windows) ou https://git-scm.com/download/mac (Mac). Next-next-finish.
- **Node não instalado?** Baixa o **LTS** em https://nodejs.org/. Next-next-finish.

Fecha e abre o terminal de novo depois de instalar.

---

## Passo 1 — Criar conta no GitHub (3 min)

O GitHub é onde o código vive. Pensa nele como um "Google Drive pra código".

1. Vai em **https://github.com/signup**
2. Coloca seu email, cria senha
3. Escolhe um username (pode ser seu nome ou apelido — vai aparecer nas URLs)
4. Confirma o email que cair na sua caixa

**Você deve ver:** o dashboard verde do GitHub vazio, com um botão **"Create repository"**.

---

## Passo 2 — Criar o repositório vazio no GitHub (1 min)

1. Clica no botão verde **"New"** ou **"Create repository"**
2. Preenche:
   - **Repository name:** `trampei`
   - **Description:** `Plataforma de trabalho rápido no Vale do Paraíba` (opcional)
   - Escolhe **Private** (só você vê — recomendado pro MVP)
   - **NÃO marque** "Add a README file", "Add .gitignore", nem "Choose a license" — deixa tudo desmarcado
3. Clica **"Create repository"**

**Você deve ver:** uma página com instruções "Quick setup" e uma URL tipo `https://github.com/SEU_USER/trampei.git`. Copia essa URL — vai usar no próximo passo.

---

## Passo 3 — Enviar o código pro GitHub (2 min)

Abre o terminal **na pasta do projeto** (`C:\Users\User\OneDrive\fast-freelancer`):

```bash
cd "C:\Users\User\OneDrive\fast-freelancer"
```

Cola esses 2 comandos (substitui `SEU_USER` pelo seu username do GitHub):

```bash
git remote add origin https://github.com/SEU_USER/trampei.git
git push -u origin main
```

Se pedir login: usa o site do GitHub pra criar um **Personal Access Token** em https://github.com/settings/tokens (cola no lugar da senha). Ou instala o **GitHub Desktop** que faz isso pra você.

**Você deve ver:** uma mensagem `Branch 'main' set up to track 'origin/main'` no terminal e, ao atualizar a página do GitHub, **todos os arquivos do projeto aparecem listados**.

---

## Passo 4 — Criar conta no Supabase (2 min)

Supabase é o **banco de dados** — onde fica tudo: usuários, perfis, solicitações, avaliações.

1. Vai em **https://supabase.com/dashboard/sign-up**
2. **Recomendado:** clica em **"Continue with GitHub"** (já estamos usando GitHub mesmo, simplifica)
3. Autoriza a Supabase a ler seu perfil GitHub
4. Confirma email se pedir

**Você deve ver:** o dashboard do Supabase com um botão **"New project"**.

---

## Passo 5 — Criar o banco de dados (3 min)

1. Clica em **"New project"**
2. **Organization:** deixa a padrão (com seu nome)
3. Preenche:
   - **Name:** `trampei-prod`
   - **Database Password:** clica em **"Generate a password"** — ele cria uma senha forte. **CLICA NO ÍCONE DE CÓPIA E SALVA NUM LUGAR SEGURO** (ex: bloco de notas). Você vai usar nos próximos passos. ⚠️ Se perder essa senha, perde acesso ao banco.
   - **Region:** **South America (São Paulo)** — mais perto, app rápido
   - **Pricing Plan:** **Free**
4. Clica **"Create new project"**
5. **Espera 1-2 min** enquanto o Supabase provisiona. A página mostra "Setting up your project..."

**Você deve ver:** o painel do projeto com menu lateral (Database, Authentication, Storage, etc.).

---

## Passo 6 — Copiar a string de conexão (1 min)

Essa string é o **endereço** que o app usa pra falar com o banco.

1. No menu lateral, clica no ícone de **engrenagem ⚙️** (canto inferior esquerdo) → **"Project Settings"**
2. No menu interno, clica em **"Database"**
3. Rola até **"Connection string"**
4. **IMPORTANTE:** clica na aba **"Connection pooling"** (não a "Direct connection")
5. Copia a string longa que aparece. Ela tem esse formato:
   ```
   postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```
6. Cola num bloco de notas e **substitui `[YOUR-PASSWORD]`** pela senha que você salvou no Passo 5

**Resultado deve ficar tipo:**
```
postgresql://postgres.abcdef123456:MinhaSenh@F0rte!@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

---

## Passo 7 — Criar tabelas no banco (2 min)

Agora vamos enviar a estrutura (tabelas, enums) pro Supabase.

No terminal, dentro da pasta do projeto, roda **substituindo a string pela sua**:

**No Windows (PowerShell):**
```powershell
$env:DATABASE_URL="postgresql://postgres.xxx:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
corepack pnpm db:push
```

**No Mac/Linux:**
```bash
DATABASE_URL="postgresql://postgres.xxx:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" pnpm db:push
```

**Você deve ver:** uma sequência de mensagens `[✓] Migration 0000_pink_lady_ursula.sql applied successfully` ou similar. Demora ~30 segundos.

**Confere no Supabase:** menu lateral → **"Database"** → **"Tables"**. Deve aparecer 11 tabelas: `users`, `worker_profiles`, `client_profiles`, `specialties`, `service_requests`, `reviews`, `referrals`, `disputes`, `notifications`, `availability`, `service_history`.

**Se aparecer erro de senha:** revisa o Passo 6, especialmente se substituiu `[YOUR-PASSWORD]` corretamente. Se tem caractere especial na senha (`@`, `#`, etc.) pode precisar codificar — peça uma senha nova pelo Supabase em **Settings → Database → Reset database password**.

---

## Passo 8 — Criar conta no Railway (2 min)

Railway é onde o **app vai rodar** — o "Heroku moderninho". Free tier dá pra começar ($5 de crédito grátis por mês).

1. Vai em **https://railway.com/login**
2. Clica em **"Login with GitHub"**
3. Autoriza
4. Pode pedir verificar email/celular — segue o processo padrão

**Você deve ver:** o dashboard do Railway vazio com botão **"New Project"**.

---

## Passo 9 — Conectar o Railway ao repositório (3 min)

1. Clica **"New Project"** → **"Deploy from GitHub repo"**
2. Se for a 1ª vez, autoriza o Railway a ler seus repos. Se quiser limitar, escolhe só **`trampei`** na lista.
3. Clica em **"trampei"** na lista que aparece
4. Railway começa a fazer build automaticamente — vai dar **erro** porque ainda não setou as variáveis. Tudo bem, é o próximo passo.

**Você deve ver:** uma página do projeto com um card "trampei" e um botão **"Settings"** em cima.

---

## Passo 10 — Configurar as variáveis de ambiente (5 min)

Aqui você vai dar pro Railway o que ele precisa pra rodar: a string do banco, a chave de segurança, etc.

1. Na página do seu projeto Railway, clica no card **"trampei"**
2. Aba **"Variables"** (lateral esquerda) ou **"Settings → Variables"**
3. Clica **"+ New Variable"** pra cada uma das seguintes (cola o nome em cima, o valor embaixo):

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Sua string do Supabase (Passo 6) |
| `JWT_SECRET` | Cola este (gerei agora aleatório): `change-me-para-um-valor-aleatorio-de-64-caracteres-em-producao-real-faca-isso` — ⚠️ **gera um real depois** |
| `VITE_OAUTH_PORTAL_URL` | `https://oauth.manus.computer` |
| `VITE_APP_ID` | `trampei-prod` (placeholder — registra no portal Manus depois) |
| `OAUTH_SERVER_URL` | `https://oauth.manus.computer` |
| `NODE_ENV` | `production` |

Pra gerar um `JWT_SECRET` **real**, roda no terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copia o resultado e cola no lugar do placeholder.

4. Depois de adicionar todas, Railway faz **redeploy automático**. Aguarda 2-3 min.

**Você deve ver:** na aba **"Deployments"**, o status muda de "Building" → "Deploying" → **"Active"** (verde).

---

## Passo 11 — Pegar a URL pública (1 min)

1. Ainda na página do projeto, clica em **"Settings"** → rola até **"Networking"**
2. Em **"Public Networking"**, clica **"Generate Domain"**
3. Aparece uma URL tipo `trampei-production.up.railway.app`

**Você deve ver:** ao colar essa URL no navegador, a **landing page TRAMPEI verde escura** com o logo aparece.

⚠️ Pode levar 30s-1min pra ficar disponível depois do "Generate Domain".

---

## Passo 12 — Testar tudo (5 min)

Abre a URL no navegador e checa:

| ✅ | Ação |
|---|---|
| ☐ | A **landing** carrega com fundo verde escuro e logo TRAMPEI |
| ☐ | Clica em **"Entrar"** → vai pra `/login` |
| ☐ | Se OAuth não tá configurado ainda, o botão "Entrar com Manus" vai pra `#` (normal) |
| ☐ | **`https://SUA-URL.up.railway.app/api/health`** retorna `{"ok":true,...}` |
| ☐ | No Supabase **Database → Tables**, as 11 tabelas continuam lá |

---

## Passo 13 — Domínio próprio (opcional, 15 min + DNS)

Só faz isso depois que tudo acima tá funcionando.

1. Compra `trampei.com.br` no **Registro.br** (~R$ 40/ano) ou **Hostinger**
2. No Railway: **Settings → Networking → Custom Domain → Add Custom Domain**
3. Digita `trampei.com.br`
4. Railway mostra um registro DNS (geralmente `CNAME`) que você precisa adicionar no painel do Registro.br
5. No Registro.br, vai em **DNS** e adiciona o registro mostrado
6. Espera 5-30 min pra propagar
7. HTTPS é automático (Let's Encrypt) — Railway emite o certificado sozinho

**Você deve ver:** ao acessar `https://trampei.com.br`, a landing TRAMPEI carrega normalmente com cadeado verde.

---

## ❓ Quando der ruim — soluções rápidas

### "fatal: remote origin already exists"
Já tem um remote configurado. Substitui em vez de adicionar:
```bash
git remote set-url origin https://github.com/SEU_USER/trampei.git
```

### Push pede senha o tempo todo
Cria um **Personal Access Token** em https://github.com/settings/tokens. Marca scope `repo`. Usa o token no lugar da senha quando pedir.

### `pnpm db:push` falha com "password authentication failed"
A senha tem caractere especial que precisou de encode. **Resolução mais simples:** no Supabase, vai em **Settings → Database → Reset database password** e gera uma nova **sem caractere especial**. Atualiza a `DATABASE_URL` com ela.

### Railway dá erro "Build failed"
Abre o log na aba **"Deployments"**. Erros mais comuns:
- **`VITE_OAUTH_PORTAL_URL is required`** → você esqueceu de adicionar essa variável no Passo 10. Add e força redeploy clicando em **"Redeploy"**.
- **`Cannot find module`** → algo estranho com cache. Em Settings, clica **"Redeploy from scratch"**.

### Página `/api/health` dá 502 / 503
App ainda subindo ou crashou. Em Railway, aba **"Deployments"** → último deploy → **"View Logs"**. Procura por mensagem de erro vermelha.

### "Too many connections" no Supabase
Você usou a **Direct connection** em vez do **Connection pooling**. Volta no Passo 6 e copia da aba certa (porta tem que ser `6543`, não `5432`).

### Login OAuth não funciona
Você ainda não registrou o app no portal Manus pra obter um `VITE_APP_ID` real. Pra MVP funcional sem OAuth, **adiciona a variável `NODE_ENV=development`** no Railway — isso mantém o painel DEV ligado e dá pra entrar sem login. **NÃO faz isso em produção real.**

---

## 🎉 Próximos passos depois que tá no ar

1. **Compartilha a URL no WhatsApp** com 2-3 amigos pra eles testarem como "logista" e "trampista" e te dar feedback
2. **Configura backup automático no Supabase** (Free tier já faz diário automaticamente — confere em **Database → Backups**)
3. **Registra a app real no portal Manus** pra ativar OAuth com usuários reais
4. **Compra o domínio próprio** (Passo 13)
5. **Adiciona Stripe ou Pagar.me** quando os primeiros logistas quiserem pagar mensalidade

Travou em algum passo? Me chama com o erro exato e a gente desbloqueia. 🚀

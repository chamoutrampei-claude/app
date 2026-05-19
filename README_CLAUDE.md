# Fast Freelancer - Instruções para Claude Code

## 🚀 Começando

Este é o projeto **Fast Freelancer** - uma plataforma web elegante para conectar clientes com trabalhadores autônomos em serviços de emergência.

### Arquivos Importantes

1. **CLAUDE_CODE_GUIDE.md** ← **LEIA PRIMEIRO!**
   - Guia completo com 9 fases de desenvolvimento
   - Exemplos de código prontos para copiar/colar
   - Checklist detalhado para cada fase
   - Timeline: 7 semanas para MVP completo

2. **BUSINESS_PLAN.md**
   - Modelo de negócio
   - Análise de custos
   - Projeção financeira
   - Precificação

3. **ARCHITECTURE.md**
   - Especificação técnica
   - Schema do banco de dados
   - Fluxos de usuário

4. **todo.md**
   - Checklist de funcionalidades
   - Marque com [x] conforme completa

---

## 📋 Estrutura do Projeto

```
fast-freelancer/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas (Home, Dashboard, etc)
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilitários (trpc, etc)
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
├── server/                # Backend Node.js
│   ├── routers.ts        # Procedures tRPC
│   ├── db.ts             # Query helpers
│   └── _core/            # Framework plumbing
├── drizzle/              # Banco de dados
│   ├── schema.ts         # Definição de tabelas (JÁ CRIADO)
│   └── 0001_*.sql        # Migrações SQL (JÁ APLICADAS)
├── shared/               # Código compartilhado
├── CLAUDE_CODE_GUIDE.md  # ← LEIA ISTO PRIMEIRO
├── BUSINESS_PLAN.md
├── ARCHITECTURE.md
├── todo.md
└── package.json
```

---

## ⚡ Quick Start

### 1. Setup Inicial
```bash
# Instalar dependências
pnpm install

# Verificar se tudo está ok
pnpm check
```

### 2. Banco de Dados
```bash
# As tabelas já foram criadas! Você pode verificar:
# - 8 tabelas criadas (users, worker_profiles, client_profiles, etc)
# - Migrações SQL já aplicadas
# - Query helpers já implementados em server/db.ts
```

### 3. Backend
```bash
# Os procedures tRPC já estão implementados:
# - auth (me, logout)
# - worker (getProfile, updateProfile, listRequests, acceptRequest, etc)
# - clientService (getProfile, updateProfile, createRequest, etc)
# - specialties (list)
# - review (create, getForUser)
```

### 4. Começar o Desenvolvimento

**Siga o CLAUDE_CODE_GUIDE.md fase por fase:**

- **Fase 1**: ✅ Setup & DB (JÁ FEITO)
- **Fase 2**: ✅ Backend (JÁ FEITO)
- **Fase 3**: ⏳ Frontend - Layout Base (PRÓXIMO)
- **Fase 4**: ⏳ Frontend - Perfis
- **Fase 5**: ⏳ Frontend - Busca
- **Fase 6**: ⏳ Frontend - Solicitações
- **Fase 7**: ⏳ Frontend - Avaliações
- **Fase 8**: ⏳ Testes & Otimizações
- **Fase 9**: ⏳ Deploy & Entrega

---

## 🎯 O que já está pronto

✅ **Banco de Dados**
- 8 tabelas criadas e migradas
- Schema Drizzle completo
- Query helpers implementados

✅ **Backend**
- Procedures tRPC para todas as funcionalidades principais
- Autenticação integrada
- Validação com Zod

✅ **Documentação**
- Guia passo a passo (CLAUDE_CODE_GUIDE.md)
- Exemplos de código prontos
- Checklist completo

---

## 📝 O que falta fazer

⏳ **Frontend (Fases 3-7)**
- Layout base com Tailwind CSS
- Páginas de perfil (cliente e trabalhador)
- Página de busca de trabalhadores
- Formulário de solicitação de serviço
- Dashboard do trabalhador
- Sistema de avaliações
- Página de histórico

⏳ **Testes (Fase 8)**
- Testes unitários com Vitest
- Testes de integração

⏳ **Deploy (Fase 9)**
- Build e otimizações finais
- Deploy em produção

---

## 🔧 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Tailwind CSS 4 + shadcn/ui |
| Backend | Node.js + Express + tRPC 11 |
| Banco | MySQL/TiDB |
| ORM | Drizzle |
| Validação | Zod |
| Testes | Vitest |
| Auth | Manus OAuth |

---

## 💡 Dicas Importantes

1. **Leia o CLAUDE_CODE_GUIDE.md** - Tem exemplos de código prontos para cada fase
2. **Use shadcn/ui** - Componentes já instalados, use para manter consistência
3. **Siga o checklist** - Marque itens em todo.md conforme completa
4. **Teste continuamente** - Não deixe para testar no final
5. **Commit frequente** - Faça commits pequenos e frequentes

---

## 📊 Estimativas

| Fase | Duração | Status |
|------|---------|--------|
| Setup & DB | 1 sem | ✅ Completo |
| Backend | 2 sem | ✅ Completo |
| Layout Base | 1 sem | ⏳ Próximo |
| Perfis | 1 sem | ⏳ |
| Busca | 1 sem | ⏳ |
| Solicitações | 1 sem | ⏳ |
| Avaliações | 1 sem | ⏳ |
| Testes | 1 sem | ⏳ |
| Deploy | 1 sem | ⏳ |
| **TOTAL** | **7 semanas** | ⏳ |

---

## 🚨 Troubleshooting

### Erro: "Cannot find name 'X'"
- Verifique imports em `drizzle/schema.ts`
- Execute `pnpm check` para validar TypeScript

### Erro: "Database connection failed"
- Verifique `DATABASE_URL` em `.env`
- Confirme que as migrações foram aplicadas

### Erro: "tRPC procedure not found"
- Verifique se o procedure está exportado em `server/routers.ts`
- Reinicie o servidor

---

## 📞 Suporte

Se tiver dúvidas:
1. Verifique o CLAUDE_CODE_GUIDE.md
2. Consulte ARCHITECTURE.md para especificações
3. Veja exemplos de código nos arquivos existentes

---

## 🎉 Próximos Passos

1. **Leia CLAUDE_CODE_GUIDE.md** (seção Fase 3)
2. **Configure Tailwind CSS** (exemplo no guia)
3. **Crie componentes base** (Button, Card, Input)
4. **Implemente layout base** (App.tsx)
5. **Teste autenticação** (useAuth hook)

**Boa sorte! 🚀**

---

**Versão**: 1.0  
**Última atualização**: 2026-05-11  
**Status**: Pronto para desenvolvimento em Claude Code

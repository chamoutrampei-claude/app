# Fast Freelancer - Plano de Negócio e Viabilidade Econômica

## 1. RESUMO EXECUTIVO

**Fast Freelancer** é uma plataforma web que conecta clientes (pequenos e médios empresários) com trabalhadores autônomos para serviços de emergência. O diferencial é manter um banco dinâmico de disponibilidade em tempo real, resolvendo o problema de encontrar profissionais "hoje" ou "agora".

### Público-alvo
- Restaurantes, pizzarias, hotéis, comércios em cidades turísticas
- Regiões iniciais: Campos do Jordão, Taubaté, Tremembé, Caçapava

### Modelo de Receita
- **Assinatura mensal** dos clientes (empresários)
- Planos: Basic (R$ 99/mês), Premium (R$ 199/mês), Enterprise (R$ 499/mês)

---

## 2. MVP - ESCOPO MÍNIMO VIÁVEL

### O que está INCLUÍDO no MVP:

#### Para Clientes (Empresários)
- ✅ Cadastro e perfil da empresa
- ✅ Busca de trabalhadores por especialidade e localização
- ✅ Criação de solicitações de serviço com urgência
- ✅ Visualização de status em tempo real
- ✅ Histórico de serviços
- ✅ Avaliação de trabalhadores (stars + comentário)

#### Para Trabalhadores
- ✅ Cadastro com foto, especialidades e disponibilidade
- ✅ Dashboard com solicitações recebidas
- ✅ Aceitar/recusar solicitações
- ✅ Atualizar status do serviço
- ✅ Histórico de trabalhos realizados
- ✅ Receber avaliações

#### Funcionalidades Técnicas
- ✅ Autenticação via Manus OAuth
- ✅ Busca e filtragem por especialidade
- ✅ Geolocalização básica (sem mapa interativo)
- ✅ Notificações em tempo real (tRPC)
- ✅ Upload de fotos (S3)
- ✅ Dashboard administrativo básico

### O que está EXCLUÍDO do MVP:

- ❌ Mapa interativo com marcadores
- ❌ Integração de pagamento (Stripe)
- ❌ Chat em tempo real entre usuários
- ❌ Agendamento automático
- ❌ Relatórios avançados
- ❌ App mobile (iOS/Android)
- ❌ Integração com WhatsApp/SMS

---

## 3. ARQUITETURA TÉCNICA OTIMIZADA

### Stack Tecnológico (Econômico)

| Componente | Tecnologia | Custo Mensal |
|-----------|-----------|------------|
| Frontend | React 19 + Tailwind CSS | R$ 0 (open-source) |
| Backend | Node.js + Express + tRPC | R$ 0 (open-source) |
| Banco de Dados | MySQL/TiDB (Manus) | Incluído no plano |
| Autenticação | Manus OAuth | Incluído no plano |
| Storage | S3 (Manus) | Incluído no plano |
| Hospedagem | Manus Webdev | Incluído no plano |
| Email | SendGrid (opcional) | R$ 0-30 |
| **TOTAL** | | **R$ 0-30** |

### Arquitetura Simplificada

```
┌─────────────────────────────────┐
│   Frontend (React + Tailwind)   │
│   - Dashboard Cliente           │
│   - Dashboard Trabalhador       │
│   - Busca & Filtragem           │
│   - Histórico & Avaliações      │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  Backend (Node.js + tRPC)       │
│  - Procedures de Negócio        │
│  - Autenticação & Autorização   │
│  - Geolocalização Básica        │
│  - Notificações Real-time       │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  Banco de Dados (MySQL)         │
│  - Usuários & Perfis            │
│  - Solicitações de Serviço      │
│  - Avaliações & Histórico       │
│  - Disponibilidade              │
└─────────────────────────────────┘
```

---

## 4. CHECKLIST DE DESENVOLVIMENTO PARA CLAUDE CODE

### Fase 1: Setup & Banco de Dados
- [ ] Criar projeto React + Node.js
- [ ] Configurar Drizzle ORM com schema
- [ ] Criar migrações SQL (8 tabelas)
- [ ] Implementar query helpers

### Fase 2: Backend - Procedures tRPC
- [ ] Auth (login, logout, me)
- [ ] Worker profiles (CRUD)
- [ ] Client profiles (CRUD)
- [ ] Service requests (create, list, update status)
- [ ] Reviews (create, list)
- [ ] Specialties (list)
- [ ] Disponibilidade (update, get)

### Fase 3: Frontend - Layout Base
- [ ] Setup Tailwind CSS com paleta elegante
- [ ] Criar layout base com navegação
- [ ] Implementar autenticação
- [ ] Role-based routing (client vs worker)

### Fase 4: Frontend - Perfis
- [ ] Página de perfil do trabalhador (edição)
- [ ] Upload de foto (S3)
- [ ] Página de perfil do cliente (edição)
- [ ] Seletor de especialidades

### Fase 5: Frontend - Busca
- [ ] Página de busca de trabalhadores
- [ ] Filtros (especialidade, localização, rating)
- [ ] Lista de trabalhadores com cards
- [ ] Paginação

### Fase 6: Frontend - Solicitações
- [ ] Formulário de solicitação de serviço
- [ ] Seletor de urgência
- [ ] Dashboard de solicitações (trabalhador)
- [ ] Botões aceitar/recusar

### Fase 7: Frontend - Status & Histórico
- [ ] Timeline de status do serviço
- [ ] Página de histórico (cliente)
- [ ] Página de histórico (trabalhador)
- [ ] Filtros de histórico

### Fase 8: Frontend - Avaliações
- [ ] Formulário de avaliação (stars + comentário)
- [ ] Exibição de ratings
- [ ] Página de perfil com reviews

### Fase 9: Testes & Otimizações
- [ ] Testes unitários (Vitest)
- [ ] Testes de integração
- [ ] Otimização de performance
- [ ] Responsividade mobile

---

## 5. MODELO DE PRECIFICAÇÃO

### Planos de Assinatura para Clientes (Empresários)

| Plano | Preço/Mês | Solicitações/Mês | Trabalhadores | Suporte |
|-------|-----------|------------------|---------------|---------|
| **Basic** | R$ 99 | 10 | Até 5 | Email |
| **Premium** | R$ 199 | 50 | Até 20 | Email + Chat |
| **Enterprise** | R$ 499 | Ilimitado | Ilimitado | Prioritário |

### Modelo de Receita Secundária (Futuro)

- **Taxa de transação**: 5% do valor final do serviço (após pagamento integrado)
- **Featured listings**: R$ 49/mês para trabalhadores aparecerem em destaque
- **Relatórios avançados**: R$ 29/mês (add-on)

---

## 6. ANÁLISE DE CUSTOS OPERACIONAIS

### Custos Mensais Fixos

| Item | Custo | Observações |
|------|-------|------------|
| Hospedagem (Manus) | R$ 0 | Incluído no plano |
| Banco de Dados | R$ 0 | Incluído no plano |
| Storage S3 | R$ 0-50 | Até 1000 fotos/mês |
| Email (SendGrid) | R$ 0-30 | Opcional, até 100/dia grátis |
| Domínio customizado | R$ 40 | Opcional, anual |
| SSL/Certificados | R$ 0 | Incluído no plano |
| **TOTAL FIXO** | **R$ 40-120** | **Mínimo viável** |

### Custos Variáveis (por usuário)

| Item | Custo | Observações |
|------|-------|------------|
| Armazenamento por foto | R$ 0,001 | S3 (~1MB por foto) |
| Bandwidth por requisição | R$ 0,0001 | Negligenciável |
| **TOTAL POR USUÁRIO** | **R$ 0,01-0,05** | **Praticamente zero** |

### Custos de Desenvolvimento (One-time)

| Fase | Horas | Custo (R$ 150/h) |
|------|-------|-----------------|
| Setup & DB | 20 | R$ 3.000 |
| Backend | 40 | R$ 6.000 |
| Frontend | 60 | R$ 9.000 |
| Testes & Deploy | 20 | R$ 3.000 |
| **TOTAL** | **140h** | **R$ 21.000** |

---

## 7. PROJEÇÃO FINANCEIRA (12 MESES)

### Cenário Conservador

**Suposições:**
- Mês 1-2: 0 clientes (fase de beta)
- Mês 3: 5 clientes
- Crescimento: +3 clientes/mês
- Mix de planos: 60% Basic, 30% Premium, 10% Enterprise

| Mês | Clientes | Receita | Custo Fixo | Lucro | Acumulado |
|-----|----------|---------|-----------|-------|-----------|
| 1-2 | 0 | R$ 0 | R$ 100 | -R$ 100 | -R$ 200 |
| 3 | 5 | R$ 649 | R$ 100 | R$ 549 | R$ 349 |
| 4 | 8 | R$ 1.038 | R$ 100 | R$ 938 | R$ 1.287 |
| 5 | 11 | R$ 1.427 | R$ 100 | R$ 1.327 | R$ 2.614 |
| 6 | 14 | R$ 1.816 | R$ 100 | R$ 1.716 | R$ 4.330 |
| 7 | 17 | R$ 2.205 | R$ 100 | R$ 2.105 | R$ 6.435 |
| 8 | 20 | R$ 2.594 | R$ 100 | R$ 2.494 | R$ 8.929 |
| 9 | 23 | R$ 2.983 | R$ 100 | R$ 2.883 | R$ 11.812 |
| 10 | 26 | R$ 3.372 | R$ 100 | R$ 3.272 | R$ 15.084 |
| 11 | 29 | R$ 3.761 | R$ 100 | R$ 3.661 | R$ 18.745 |
| 12 | 32 | R$ 4.150 | R$ 100 | R$ 4.050 | R$ 22.795 |

**Break-even:** Mês 3 (5 clientes)  
**Lucro anual:** R$ 22.795  
**ROI:** 108% (R$ 21.000 investimento inicial)

### Cenário Otimista

**Suposições:**
- Crescimento: +5 clientes/mês
- Mix de planos: 50% Basic, 35% Premium, 15% Enterprise

| Mês | Clientes | Receita | Lucro | Acumulado |
|-----|----------|---------|-------|-----------|
| 3 | 10 | R$ 1.298 | R$ 1.198 | R$ 1.198 |
| 6 | 25 | R$ 3.245 | R$ 3.145 | R$ 9.633 |
| 9 | 40 | R$ 5.192 | R$ 5.092 | R$ 22.009 |
| 12 | 55 | R$ 7.139 | R$ 7.039 | R$ 38.270 |

**Break-even:** Mês 2  
**Lucro anual:** R$ 38.270  
**ROI:** 182%

---

## 8. CUSTOS PARA IDEALIZADORES DO PROJETO

### Investimento Inicial (One-time)

| Item | Custo |
|------|-------|
| Desenvolvimento MVP (140h) | R$ 21.000 |
| Domínio customizado (1 ano) | R$ 40 |
| Setup inicial & testes | R$ 0 (incluído) |
| **TOTAL INICIAL** | **R$ 21.040** |

### Custos Operacionais Mensais (Recorrentes)

| Item | Custo |
|------|-------|
| Hospedagem & Infraestrutura | R$ 0-120 |
| Manutenção & Suporte (10h/mês) | R$ 1.500 |
| **TOTAL MENSAL** | **R$ 1.500-1.620** |

### Projeção de Custos Anuais

| Período | Desenvolvimento | Operacional | Total |
|---------|-----------------|-------------|-------|
| Ano 1 (setup) | R$ 21.040 | R$ 18.000 | **R$ 39.040** |
| Ano 2+ | R$ 0 | R$ 18.000 | **R$ 18.000** |

---

## 9. VIABILIDADE ECONÔMICA

### Análise de Break-even

**Investimento:** R$ 21.040  
**Custo mensal fixo:** R$ 100  
**Receita por cliente (média):** R$ 130/mês

**Clientes necessários para break-even:** 162 clientes

**Tempo para break-even:** 
- Cenário conservador: ~12 meses
- Cenário otimista: ~4-5 meses

### Margem de Lucro

**Ano 1 (conservador):**
- Receita: R$ 22.795
- Custos: R$ 39.040
- Lucro: -R$ 16.245 (prejuízo esperado em startup)

**Ano 2 (conservador):**
- Receita: R$ 50.000+ (com 40+ clientes)
- Custos: R$ 18.000
- Lucro: R$ 32.000+
- Margem: 64%

**Ano 3+ (conservador):**
- Receita: R$ 100.000+ (com 80+ clientes)
- Custos: R$ 18.000
- Lucro: R$ 82.000+
- Margem: 82%

---

## 10. RECOMENDAÇÕES PARA VIABILIDADE

### Otimizações de Custo

1. **Use Manus Webdev** - Hospedagem, BD e storage inclusos
2. **Não integre Stripe no MVP** - Adicione depois (reduz complexidade)
3. **Sem mapa interativo no MVP** - Geolocalização simples é suficiente
4. **Sem chat em tempo real** - Use notificações tRPC apenas
5. **Sem app mobile no MVP** - Web responsivo é suficiente

### Estratégias de Receita

1. **Comece com assinatura mensal** - Previsível e simples
2. **Ofereça trial gratuito de 7 dias** - Reduz fricção
3. **Adicione taxa de transação depois** - Quando pagamento integrado
4. **Crie plano Enterprise customizado** - Para grandes clientes

### Estratégias de Crescimento

1. **Foco regional inicial** - Apenas 4 cidades no MVP
2. **Parcerias com associações comerciais** - Restaurantes, hotéis
3. **Programa de referência** - Desconto para indicações
4. **Testimoniais e case studies** - Após primeiros 10 clientes

---

## 11. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|--------|-----------|
| Baixa adoção inicial | Alta | Alto | Foco em UX, trial grátis |
| Concorrência | Média | Médio | Diferencial: disponibilidade real-time |
| Churn de clientes | Média | Médio | Suporte excelente, features rápidas |
| Problemas técnicos | Baixa | Alto | Testes rigorosos, monitoramento |

---

## 12. TIMELINE DE DESENVOLVIMENTO

| Fase | Duração | Marcos |
|------|---------|--------|
| Setup & DB | 1 semana | Schema pronto, migrações aplicadas |
| Backend | 2 semanas | Procedures tRPC funcionando |
| Frontend | 3 semanas | Todas as páginas funcionais |
| Testes & Deploy | 1 semana | MVP em produção |
| **TOTAL** | **7 semanas** | **MVP pronto para launch** |

---

## 13. CONCLUSÃO

**Fast Freelancer é viável economicamente** porque:

✅ Custos operacionais mínimos (R$ 100-120/mês)  
✅ Investimento inicial baixo (R$ 21.040)  
✅ Break-even em 4-12 meses (dependendo do crescimento)  
✅ Margem de lucro alta (64-82% após ano 2)  
✅ Escalável sem custos adicionais significativos  
✅ MVP pode ser desenvolvido em 7 semanas  

**Recomendação:** Prosseguir com desenvolvimento no Claude Code, seguindo o checklist da Fase 1-9.

---

**Documento preparado em:** 2026-05-11  
**Versão:** 1.0  
**Status:** Pronto para desenvolvimento

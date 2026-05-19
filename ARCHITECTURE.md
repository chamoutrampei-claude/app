# Fast Freelancer - Arquitetura e Planejamento

## Visão Geral

**Fast Freelancer** é uma plataforma elegante e sofisticada que conecta clientes com trabalhadores autônomos para serviços de emergência. O diferencial principal é manter um banco dinâmico de disponibilidade em tempo real, permitindo que empresários encontrem profissionais disponíveis "hoje" ou "agora".

## Modelo de Negócio

- **Público-alvo**: Pequenos e médios empresários (restaurantes, pizzarias, hotéis, comércios)
- **Regiões-foco**: Cidades turísticas (Campos do Jordão, Taubaté, Tremembé, Caçapava)
- **Monetização**: Assinatura mensal (ex: R$99/mês) ou modelo baseado em uso
- **Diferencial**: Banco de disponibilidade em tempo real, não apenas currículo

## Arquitetura do Sistema

### Camadas

```
┌─────────────────────────────────────────┐
│      Frontend (React 19 + Tailwind)     │
│  - Dashboard Cliente                    │
│  - Dashboard Trabalhador                │
│  - Mapa Interativo                      │
│  - Solicitações & Histórico             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Backend (Express + tRPC + Node.js)   │
│  - Procedures de Negócio                │
│  - Autenticação & Autorização           │
│  - Geolocalização & Busca               │
│  - Notificações em Tempo Real           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    Banco de Dados (MySQL/TiDB)          │
│  - Usuários (Clientes & Trabalhadores)  │
│  - Disponibilidade Dinâmica             │
│  - Solicitações de Serviço              │
│  - Avaliações & Histórico               │
└─────────────────────────────────────────┘
```

## Modelo de Dados

### Tabelas Principais

#### 1. **users** (Existente - Estendida)

```sql
- id (PK)
- openId (Manus OAuth)
- name
- email
- role: 'client' | 'worker' | 'admin'
- createdAt
- updatedAt
- lastSignedIn
```

#### 2. **worker_profiles**

Perfil detalhado do trabalhador.

```sql
- id (PK)
- userId (FK → users)
- photo_url (S3)
- bio (texto curto)
- specialties (JSON: array de especialidades)
- city (localização)
- latitude, longitude (geolocalização)
- hourly_rate (tarifa por hora)
- rating (média de avaliações)
- total_reviews (quantidade)
- is_active (ativo/inativo)
- createdAt
- updatedAt
```

#### 3. **client_profiles**

Perfil da empresa/cliente.

```sql
- id (PK)
- userId (FK → users)
- company_name
- phone
- city
- latitude, longitude
- rating (média de avaliações)
- total_reviews
- subscription_plan ('basic' | 'premium' | 'enterprise')
- subscription_expires_at
- createdAt
- updatedAt
```

#### 4. **specialties**

Catálogo de especialidades.

```sql
- id (PK)
- name (ex: 'Encanador', 'Eletricista', 'Garçom')
- description
- icon_url
- createdAt
```

#### 5. **availability**

Disponibilidade dinâmica do trabalhador.

```sql
- id (PK)
- worker_id (FK → worker_profiles)
- date (data específica)
- time_slot ('morning' | 'afternoon' | 'evening' | 'night')
- is_available (true/false)
- updated_at (timestamp da última atualização)
```

#### 6. **service_requests**

Solicitações de serviço.

```sql
- id (PK)
- client_id (FK → client_profiles)
- worker_id (FK → worker_profiles, nullable até aceitar)
- specialty_id (FK → specialties)
- title (ex: 'Encanador urgente')
- description (detalhe do problema)
- urgency_level ('low' | 'medium' | 'high' | 'critical')
- status ('requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled')
- scheduled_date
- scheduled_time
- location_latitude, location_longitude
- estimated_duration_minutes
- proposed_price
- final_price (preço final após conclusão)
- created_at
- accepted_at
- started_at
- completed_at
```

#### 7. **reviews**

Avaliações e comentários.

```sql
- id (PK)
- service_request_id (FK → service_requests)
- reviewer_id (FK → users)
- reviewed_user_id (FK → users)
- rating (1-5 stars)
- comment (texto)
- created_at
```

#### 8. **service_history**

Histórico desnormalizado para performance.

```sql
- id (PK)
- user_id (FK → users)
- service_request_id (FK → service_requests)
- role ('client' | 'worker')
- status_at_time (snapshot do status)
- created_at
```

## Fluxos de Usuário

### Fluxo 1: Cadastro e Perfil do Trabalhador

1. Trabalhador acessa a plataforma
2. Faz login via Manus OAuth
3. Completa perfil:
   - Foto de perfil (upload S3)
   - Bio/descrição
   - Especialidades (multi-select)
   - Cidade/localização
   - Tarifa horária
4. Sistema atualiza `worker_profiles` e `availability`

### Fluxo 2: Cadastro do Cliente

1. Cliente acessa a plataforma
2. Faz login via Manus OAuth
3. Completa perfil:
   - Nome da empresa
   - Telefone
   - Localização (lat/lng)
   - Plano de assinatura
4. Sistema atualiza `client_profiles`

### Fluxo 3: Busca e Filtragem

1. Cliente acessa dashboard
2. Filtra por:
   - Especialidade
   - Localização (raio de distância)
   - Disponibilidade (hoje, amanhã, etc.)
   - Rating
3. Sistema consulta `worker_profiles` + `availability`
4. Exibe lista ordenada por proximidade/rating

### Fluxo 4: Solicitação de Serviço

1. Cliente clica em "Solicitar Serviço"
2. Preenche:
   - Especialidade
   - Descrição do problema
   - Nível de urgência
   - Data/hora desejada
   - Localização
3. Sistema cria registro em `service_requests` com status `requested`
4. Notifica trabalhadores disponíveis (via tRPC real-time ou WebSocket)

### Fluxo 5: Aceitar/Recusar Solicitação

1. Trabalhador recebe notificação
2. Visualiza detalhes da solicitação
3. Aceita ou recusa
4. Se aceitar: status muda para `accepted`, worker_id é preenchido
5. Se recusar: notificação vai para próximo trabalhador disponível

### Fluxo 6: Acompanhamento em Tempo Real

1. Após aceitar, trabalhador pode atualizar status:
   - `in_progress`: iniciou o trabalho
   - `completed`: finalizou
2. Cliente vê atualizações em tempo real no mapa/dashboard
3. Histórico é registrado em `service_history`

### Fluxo 7: Avaliação e Comentários

1. Após conclusão, cliente e trabalhador podem se avaliar
2. Registros em `reviews`
3. Ratings são agregados em `worker_profiles` e `client_profiles`

## Funcionalidades Principais

### Para Clientes

- ✅ Dashboard com histórico de solicitações
- ✅ Busca e filtragem de trabalhadores
- ✅ Mapa interativo com localização de profissionais
- ✅ Criação de solicitações com urgência
- ✅ Acompanhamento em tempo real
- ✅ Histórico completo de serviços
- ✅ Avaliação de trabalhadores
- ✅ Gerenciamento de assinatura

### Para Trabalhadores

- ✅ Perfil completo com foto e especialidades
- ✅ Dashboard com solicitações recebidas
- ✅ Aceitar/recusar solicitações
- ✅ Atualizar status do serviço
- ✅ Histórico de trabalhos realizados
- ✅ Receber avaliações
- ✅ Gerenciar disponibilidade

### Para Administradores

- ✅ Dashboard de métricas
- ✅ Gerenciamento de especialidades
- ✅ Suporte a usuários
- ✅ Relatórios de uso

## Design Visual

### Paleta de Cores

| Elemento | Cor | Uso |
|----------|-----|-----|
| Primária | #1e40af (Azul profundo) | Confiança, ações principais |
| Secundária | #059669 (Verde esmeralda) | Sucesso, confirmações |
| Acento | #f97316 (Laranja quente) | Urgência, alertas |
| Neutro | #6b7280 (Cinza sofisticado) | Textos secundários |
| Fundo | #ffffff (Branco) + #f9fafb (Cinza leve) | Superfícies |

### Tipografia

- **Headings**: Inter Bold (sans-serif moderna)
- **Body**: Inter Regular (legibilidade)
- **Monospace**: JetBrains Mono (dados técnicos)

### Componentes

- Buttons elegantes com hover suave
- Cards com sombra refinada
- Inputs com focus ring sofisticado
- Modals com backdrop blur
- Notificações toast com ícones
- Mapas com marcadores customizados

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui |
| Backend | Express 4, tRPC 11, Node.js |
| Banco de Dados | MySQL/TiDB |
| Autenticação | Manus OAuth |
| Mapas | Google Maps API (proxy Manus) |
| Storage | S3 (via storagePut) |
| Notificações | tRPC real-time + WebSocket |
| Testes | Vitest |

## Próximos Passos

1. ✅ Criar schema Drizzle com todas as tabelas
2. ✅ Gerar migrações SQL
3. ✅ Implementar procedures tRPC
4. ✅ Desenvolver componentes frontend
5. ✅ Integrar mapa interativo
6. ✅ Implementar notificações em tempo real
7. ✅ Testes e otimizações

---

**Versão**: 1.0  
**Última atualização**: 2026-05-11

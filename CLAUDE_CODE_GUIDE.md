# Fast Freelancer - Guia de Desenvolvimento para Claude Code

## 📋 Visão Geral

Este documento é um **guia prático e detalhado** para desenvolver o Fast Freelancer no Claude Code. Segue uma abordagem **fase por fase**, com instruções claras, exemplos de código e checklist.

**Tempo estimado:** 7 semanas (140 horas)  
**Stack:** React 19 + Node.js + Express + tRPC + MySQL  
**Plataforma:** Manus Webdev

---

## 🎯 Fase 1: Setup & Banco de Dados (1 semana)

### Objetivo
Ter o projeto rodando com todas as tabelas criadas e migrações aplicadas.

### Tarefas

#### 1.1 Criar Projeto React + Node.js
```bash
# Criar pasta do projeto
mkdir fast-freelancer
cd fast-freelancer

# Inicializar com npm/pnpm
pnpm init

# Instalar dependências principais
pnpm add react react-dom express @trpc/server @trpc/client @trpc/react-query
pnpm add -D typescript @types/node @types/react vite
```

#### 1.2 Estrutura de Pastas
```
fast-freelancer/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/            # Páginas (Home, Dashboard, etc)
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilitários (trpc, etc)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
├── server/                    # Backend Node.js
│   ├── routers.ts            # Procedures tRPC
│   ├── db.ts                 # Query helpers
│   └── index.ts              # Server entry point
├── drizzle/                   # Banco de dados
│   ├── schema.ts             # Definição de tabelas
│   └── migrations/           # Arquivos SQL gerados
├── shared/                    # Código compartilhado
│   └── types.ts              # Tipos compartilhados
├── package.json
└── tsconfig.json
```

#### 1.3 Configurar Drizzle ORM
```bash
# Instalar Drizzle
pnpm add drizzle-orm mysql2
pnpm add -D drizzle-kit

# Criar drizzle.config.ts
cat > drizzle.config.ts << 'EOF'
import type { Config } from "drizzle-kit";

export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  driver: "mysql2",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
EOF
```

#### 1.4 Criar Schema Drizzle (drizzle/schema.ts)

**Tabelas necessárias:**
1. `users` - Usuários (já existe, estender com role)
2. `worker_profiles` - Perfil do trabalhador
3. `client_profiles` - Perfil do cliente
4. `specialties` - Catálogo de especialidades
5. `availability` - Disponibilidade dinâmica
6. `service_requests` - Solicitações de serviço
7. `reviews` - Avaliações
8. `service_history` - Histórico

**Exemplo de schema (simplificado):**
```typescript
import { int, mysqlTable, varchar, text, timestamp, boolean, json, float, decimal, mysqlEnum } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["user", "client", "worker", "admin"]).default("user"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const workerProfiles = mysqlTable("worker_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  photoUrl: text("photoUrl"),
  bio: text("bio"),
  specialties: json("specialties").$type<number[]>().default([]),
  city: varchar("city", { length: 100 }),
  latitude: float("latitude"),
  longitude: float("longitude"),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
  rating: float("rating").default(0),
  totalReviews: int("totalReviews").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ... outras tabelas seguem o mesmo padrão
```

#### 1.5 Gerar Migrações
```bash
# Gerar arquivo SQL de migração
pnpm drizzle-kit generate

# Aplicar migrações ao banco
pnpm drizzle-kit migrate
```

#### 1.6 Criar Query Helpers (server/db.ts)
```typescript
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, workerProfiles, clientProfiles } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

// Worker profile queries
export async function getWorkerProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, userId));
  return result[0];
}

export async function updateWorkerProfile(userId: number, data: any) {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(workerProfiles).set(data).where(eq(workerProfiles.userId, userId));
  return getWorkerProfile(userId);
}

// ... mais helpers conforme necessário
```

### ✅ Checklist Fase 1
- [ ] Projeto criado com estrutura de pastas
- [ ] Drizzle ORM configurado
- [ ] Schema com 8 tabelas definido
- [ ] Migrações SQL geradas
- [ ] Banco de dados atualizado
- [ ] Query helpers implementados
- [ ] TypeScript sem erros

---

## 🔧 Fase 2: Backend - Procedures tRPC (2 semanas)

### Objetivo
Implementar todas as procedures tRPC para o backend funcionar.

### Tarefas

#### 2.1 Setup tRPC (server/index.ts)
```typescript
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./context";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// tRPC middleware
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

#### 2.2 Procedures de Autenticação
```typescript
// server/routers.ts
export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie("session");
      return { success: true };
    }),
  }),
  
  // ... mais routers
});
```

#### 2.3 Procedures de Perfil do Trabalhador
```typescript
worker: router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return getWorkerProfile(ctx.user.id);
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      photoUrl: z.string().optional(),
      bio: z.string().optional(),
      specialties: z.array(z.number()).optional(),
      city: z.string().optional(),
      hourlyRate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return updateWorkerProfile(ctx.user.id, input);
    }),

  listRequests: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Query service_requests onde workerId = ctx.user.id
    return [];
  }),

  acceptRequest: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Update service_request com worker_id e status='accepted'
      return { success: true };
    }),
}),
```

#### 2.4 Procedures de Perfil do Cliente
```typescript
clientService: router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return getClientProfile(ctx.user.id);
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      companyName: z.string().optional(),
      phone: z.string().optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return updateClientProfile(ctx.user.id, input);
    }),

  createRequest: protectedProcedure
    .input(z.object({
      specialtyId: z.number(),
      title: z.string(),
      description: z.string(),
      urgencyLevel: z.enum(["low", "medium", "high", "critical"]),
      scheduledDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Create service_request
      return { id: 1, status: "requested" };
    }),
}),
```

#### 2.5 Procedures de Especialidades
```typescript
specialties: router({
  list: publicProcedure.query(async () => {
    return listSpecialties();
  }),
}),
```

#### 2.6 Procedures de Avaliações
```typescript
review: router({
  create: protectedProcedure
    .input(z.object({
      serviceRequestId: z.number(),
      reviewedUserId: z.number(),
      rating: z.number().min(1).max(5),
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createReview({
        serviceRequestId: input.serviceRequestId,
        reviewerId: ctx.user.id,
        reviewedUserId: input.reviewedUserId,
        rating: input.rating,
        comment: input.comment,
      });
    }),

  getForUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return getReviewsForUser(input.userId);
    }),
}),
```

### ✅ Checklist Fase 2
- [ ] tRPC setup completo
- [ ] Auth procedures (me, logout)
- [ ] Worker procedures (getProfile, updateProfile, listRequests, acceptRequest, rejectRequest)
- [ ] Client procedures (getProfile, updateProfile, createRequest, listRequests)
- [ ] Specialty procedures (list)
- [ ] Review procedures (create, getForUser)
- [ ] Testes unitários com Vitest
- [ ] TypeScript sem erros

---

## 🎨 Fase 3: Frontend - Layout Base (1 semana)

### Objetivo
Ter a navegação, autenticação e layout base funcionando.

### Tarefas

#### 3.1 Setup Tailwind CSS
```bash
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### 3.2 Configurar Tema Elegante (client/src/index.css)
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --primary: #1e40af;      /* Azul profundo */
  --secondary: #059669;    /* Verde esmeralda */
  --accent: #f97316;       /* Laranja quente */
  --neutral: #6b7280;      /* Cinza sofisticado */
  --bg: #ffffff;           /* Branco */
  --bg-light: #f9fafb;     /* Cinza leve */
}

body {
  font-family: 'Inter', sans-serif;
  background-color: var(--bg);
  color: var(--neutral);
}

h1, h2, h3 {
  font-weight: 700;
  color: #1f2937;
}

button {
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 600;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 24px;
}
```

#### 3.3 Criar Componentes Base
```typescript
// client/src/components/Button.tsx
export function Button({ children, variant = "primary", ...props }) {
  const variants = {
    primary: "bg-primary text-white hover:bg-blue-700",
    secondary: "bg-secondary text-white hover:bg-green-700",
    outline: "border-2 border-primary text-primary hover:bg-blue-50",
  };
  
  return (
    <button className={`px-4 py-2 rounded-lg ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
}

// client/src/components/Card.tsx
export function Card({ children, className = "" }) {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
}

// client/src/components/Input.tsx
export function Input({ label, ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-600 mb-2">{label}</label>}
      <input
        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none"
        {...props}
      />
    </div>
  );
}
```

#### 3.4 Criar Layout Base (client/src/App.tsx)
```typescript
import { useAuth } from "./hooks/useAuth";
import { Route, Switch } from "wouter";
import Home from "./pages/Home";
import WorkerDashboard from "./pages/WorkerDashboard";
import ClientDashboard from "./pages/ClientDashboard";

function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="min-h-screen bg-bg-light">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Fast Freelancer</h1>
          {user && <span>Olá, {user.name}</span>}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/worker/dashboard" component={WorkerDashboard} />
          <Route path="/client/dashboard" component={ClientDashboard} />
        </Switch>
      </main>
    </div>
  );
}

export default App;
```

#### 3.5 Criar Hook de Autenticação
```typescript
// client/src/hooks/useAuth.ts
import { trpc } from "../lib/trpc";

export function useAuth() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const logout = trpc.auth.logout.useMutation();

  return {
    user,
    loading: isLoading,
    logout: () => logout.mutate(),
  };
}
```

### ✅ Checklist Fase 3
- [ ] Tailwind CSS configurado
- [ ] Tema elegante definido
- [ ] Componentes base criados (Button, Card, Input)
- [ ] Layout base implementado
- [ ] Navegação funcionando
- [ ] Hook useAuth funcionando
- [ ] Role-based routing (client vs worker)

---

## 👤 Fase 4: Frontend - Perfis de Usuário (1 semana)

### Objetivo
Ter páginas de edição de perfil para cliente e trabalhador.

### Tarefas

#### 4.1 Página de Perfil do Trabalhador
```typescript
// client/src/pages/WorkerProfile.tsx
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { useState } from "react";
import { Button, Input, Card } from "../components";

export default function WorkerProfile() {
  const { user } = useAuth();
  const { data: profile } = trpc.worker.getProfile.useQuery();
  const updateProfile = trpc.worker.updateProfile.useMutation();
  
  const [formData, setFormData] = useState({
    bio: profile?.bio || "",
    city: profile?.city || "",
    hourlyRate: profile?.hourlyRate || "",
    specialties: profile?.specialties || [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <h1 className="text-3xl font-bold mb-6">Meu Perfil</h1>
        
        <form onSubmit={handleSubmit}>
          <Input
            label="Bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Descreva sua experiência"
          />
          
          <Input
            label="Cidade"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          
          <Input
            label="Tarifa Horária (R$)"
            type="number"
            value={formData.hourlyRate}
            onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
          />
          
          <Button type="submit" variant="primary">
            Salvar Perfil
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

#### 4.2 Página de Perfil do Cliente
```typescript
// client/src/pages/ClientProfile.tsx
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { useState } from "react";
import { Button, Input, Card } from "../components";

export default function ClientProfile() {
  const { user } = useAuth();
  const { data: profile } = trpc.clientService.getProfile.useQuery();
  const updateProfile = trpc.clientService.updateProfile.useMutation();
  
  const [formData, setFormData] = useState({
    companyName: profile?.companyName || "",
    phone: profile?.phone || "",
    city: profile?.city || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile.mutate(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <h1 className="text-3xl font-bold mb-6">Perfil da Empresa</h1>
        
        <form onSubmit={handleSubmit}>
          <Input
            label="Nome da Empresa"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          />
          
          <Input
            label="Telefone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          
          <Input
            label="Cidade"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          
          <Button type="submit" variant="primary">
            Salvar Perfil
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

#### 4.3 Upload de Foto (S3)
```typescript
// client/src/hooks/usePhotoUpload.ts
import { trpc } from "../lib/trpc";

export function usePhotoUpload() {
  const uploadPhoto = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    
    const { url } = await response.json();
    return url;
  };

  return { uploadPhoto };
}
```

### ✅ Checklist Fase 4
- [ ] Página de perfil do trabalhador criada
- [ ] Página de perfil do cliente criada
- [ ] Formulários funcionando
- [ ] Upload de foto implementado
- [ ] Validação de formulários
- [ ] Mensagens de sucesso/erro

---

## 🔍 Fase 5: Frontend - Busca e Filtragem (1 semana)

### Objetivo
Ter página de busca de trabalhadores com filtros funcionando.

### Tarefas

#### 5.1 Página de Busca
```typescript
// client/src/pages/SearchWorkers.tsx
import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, Button, Input } from "../components";

export default function SearchWorkers() {
  const [filters, setFilters] = useState({
    specialtyId: "",
    city: "",
    minRating: 0,
  });

  const { data: specialties } = trpc.specialties.list.useQuery();
  
  // TODO: Implementar query de busca com filtros
  const workers = [];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Buscar Trabalhadores</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <select
          className="border-2 border-gray-200 rounded-lg p-2"
          value={filters.specialtyId}
          onChange={(e) => setFilters({ ...filters, specialtyId: e.target.value })}
        >
          <option value="">Todas as especialidades</option>
          {specialties?.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        
        <Input
          placeholder="Cidade"
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
        />
        
        <Input
          type="number"
          placeholder="Rating mínimo"
          value={filters.minRating}
          onChange={(e) => setFilters({ ...filters, minRating: parseInt(e.target.value) })}
        />
        
        <Button variant="primary">Buscar</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {workers.map((worker) => (
          <Card key={worker.id}>
            <img src={worker.photoUrl} alt={worker.name} className="w-full h-48 object-cover rounded-lg mb-4" />
            <h2 className="text-xl font-bold">{worker.name}</h2>
            <p className="text-neutral mb-2">{worker.bio}</p>
            <div className="flex justify-between items-center mb-4">
              <span className="text-yellow-500">⭐ {worker.rating}</span>
              <span className="text-primary font-bold">R$ {worker.hourlyRate}/h</span>
            </div>
            <Button variant="primary" className="w-full">
              Ver Perfil
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### ✅ Checklist Fase 5
- [ ] Página de busca criada
- [ ] Filtros implementados
- [ ] Lista de trabalhadores exibida
- [ ] Cards com informações do trabalhador
- [ ] Paginação (opcional)

---

## 📋 Fase 6: Frontend - Solicitações de Serviço (1 semana)

### Objetivo
Ter fluxo completo de criação e gerenciamento de solicitações.

### Tarefas

#### 6.1 Formulário de Solicitação
```typescript
// client/src/pages/CreateServiceRequest.tsx
import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, Button, Input } from "../components";

export default function CreateServiceRequest() {
  const [formData, setFormData] = useState({
    specialtyId: "",
    title: "",
    description: "",
    urgencyLevel: "medium",
    scheduledDate: "",
  });

  const { data: specialties } = trpc.specialties.list.useQuery();
  const createRequest = trpc.clientService.createRequest.useMutation();

  const handleSubmit = (e) => {
    e.preventDefault();
    createRequest.mutate(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <h1 className="text-3xl font-bold mb-6">Solicitar Serviço</h1>
        
        <form onSubmit={handleSubmit}>
          <select
            className="w-full border-2 border-gray-200 rounded-lg p-2 mb-4"
            value={formData.specialtyId}
            onChange={(e) => setFormData({ ...formData, specialtyId: parseInt(e.target.value) })}
          >
            <option value="">Selecione uma especialidade</option>
            {specialties?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          
          <Input
            label="Título"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Encanador urgente"
          />
          
          <textarea
            className="w-full border-2 border-gray-200 rounded-lg p-2 mb-4"
            rows={5}
            placeholder="Descreva o problema em detalhes"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          
          <select
            className="w-full border-2 border-gray-200 rounded-lg p-2 mb-4"
            value={formData.urgencyLevel}
            onChange={(e) => setFormData({ ...formData, urgencyLevel: e.target.value })}
          >
            <option value="low">Baixa urgência</option>
            <option value="medium">Média urgência</option>
            <option value="high">Alta urgência</option>
            <option value="critical">Crítica</option>
          </select>
          
          <Input
            label="Data desejada"
            type="date"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
          />
          
          <Button type="submit" variant="primary" className="w-full">
            Solicitar Serviço
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

#### 6.2 Dashboard do Trabalhador
```typescript
// client/src/pages/WorkerDashboard.tsx
import { trpc } from "../lib/trpc";
import { Card, Button } from "../components";

export default function WorkerDashboard() {
  const { data: requests } = trpc.worker.listRequests.useQuery();
  const acceptRequest = trpc.worker.acceptRequest.useMutation();
  const rejectRequest = trpc.worker.rejectRequest.useMutation();

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Minhas Solicitações</h1>
      
      <div className="grid grid-cols-1 gap-4">
        {requests?.map((req) => (
          <Card key={req.id}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{req.title}</h2>
                <p className="text-neutral">{req.description}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-white font-bold ${
                req.urgencyLevel === 'critical' ? 'bg-red-500' :
                req.urgencyLevel === 'high' ? 'bg-orange-500' :
                req.urgencyLevel === 'medium' ? 'bg-yellow-500' :
                'bg-green-500'
              }`}>
                {req.urgencyLevel}
              </span>
            </div>
            
            <div className="flex gap-4">
              <Button
                variant="primary"
                onClick={() => acceptRequest.mutate({ requestId: req.id })}
              >
                Aceitar
              </Button>
              <Button
                variant="outline"
                onClick={() => rejectRequest.mutate({ requestId: req.id })}
              >
                Recusar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### ✅ Checklist Fase 6
- [ ] Formulário de solicitação criado
- [ ] Dashboard do trabalhador implementado
- [ ] Botões aceitar/recusar funcionando
- [ ] Notificações de sucesso/erro

---

## ⭐ Fase 7: Frontend - Avaliações e Histórico (1 semana)

### Objetivo
Ter sistema de avaliações e histórico de serviços.

### Tarefas

#### 7.1 Formulário de Avaliação
```typescript
// client/src/pages/ReviewService.tsx
import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, Button, Input } from "../components";

export default function ReviewService({ serviceRequestId, reviewedUserId }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  
  const createReview = trpc.review.create.useMutation();

  const handleSubmit = (e) => {
    e.preventDefault();
    createReview.mutate({
      serviceRequestId,
      reviewedUserId,
      rating,
      comment,
    });
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-4">Avaliar Serviço</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-600 mb-2">Classificação</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-4xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
              >
                ⭐
              </button>
            ))}
          </div>
        </div>
        
        <textarea
          className="w-full border-2 border-gray-200 rounded-lg p-2 mb-4"
          rows={4}
          placeholder="Deixe um comentário (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        
        <Button type="submit" variant="primary" className="w-full">
          Enviar Avaliação
        </Button>
      </form>
    </Card>
  );
}
```

#### 7.2 Página de Histórico
```typescript
// client/src/pages/ServiceHistory.tsx
import { trpc } from "../lib/trpc";
import { Card } from "../components";

export default function ServiceHistory() {
  const { data: history } = trpc.clientService.listRequests.useQuery();

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Histórico de Serviços</h1>
      
      <div className="grid grid-cols-1 gap-4">
        {history?.map((service) => (
          <Card key={service.id}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{service.title}</h2>
                <p className="text-neutral mb-2">{service.description}</p>
                <p className="text-sm text-gray-500">
                  {new Date(service.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-white font-bold ${
                service.status === 'completed' ? 'bg-green-500' :
                service.status === 'in_progress' ? 'bg-blue-500' :
                service.status === 'accepted' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`}>
                {service.status}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### ✅ Checklist Fase 7
- [ ] Formulário de avaliação criado
- [ ] Sistema de stars funcionando
- [ ] Página de histórico implementada
- [ ] Filtros de histórico (opcional)

---

## 🧪 Fase 8: Testes e Otimizações (1 semana)

### Objetivo
Ter testes cobrindo funcionalidades críticas e otimizações implementadas.

### Tarefas

#### 8.1 Testes Unitários (Vitest)
```bash
pnpm add -D vitest @testing-library/react
```

```typescript
// server/routers.test.ts
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Worker Router", () => {
  it("should get worker profile", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, role: "worker" },
    });
    
    const profile = await caller.worker.getProfile();
    expect(profile).toBeDefined();
  });

  it("should update worker profile", async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, role: "worker" },
    });
    
    const updated = await caller.worker.updateProfile({
      bio: "Novo bio",
      city: "São Paulo",
    });
    
    expect(updated?.bio).toBe("Novo bio");
  });
});
```

#### 8.2 Otimizações
- [ ] Implementar caching com React Query
- [ ] Lazy loading de imagens
- [ ] Code splitting de rotas
- [ ] Otimizar queries SQL com índices

### ✅ Checklist Fase 8
- [ ] Testes unitários escritos
- [ ] Testes de integração
- [ ] Responsividade mobile testada
- [ ] Performance otimizada

---

## 🚀 Fase 9: Deploy e Entrega (1 semana)

### Objetivo
Ter MVP pronto para produção.

### Tarefas

#### 9.1 Build e Deploy
```bash
# Build frontend
pnpm build

# Deploy no Manus Webdev
# (Seguir instruções da plataforma)
```

#### 9.2 Checklist Final
- [ ] Todas as funcionalidades testadas
- [ ] Sem erros TypeScript
- [ ] Responsividade mobile confirmada
- [ ] Performance otimizada
- [ ] Documentação atualizada
- [ ] Pronto para produção

---

## 📊 Resumo de Tarefas

| Fase | Duração | Tarefas | Status |
|------|---------|--------|--------|
| 1 | 1 sem | Setup, DB, Schema | ⏳ |
| 2 | 2 sem | Backend, tRPC | ⏳ |
| 3 | 1 sem | Layout, Autenticação | ⏳ |
| 4 | 1 sem | Perfis de Usuário | ⏳ |
| 5 | 1 sem | Busca e Filtragem | ⏳ |
| 6 | 1 sem | Solicitações | ⏳ |
| 7 | 1 sem | Avaliações, Histórico | ⏳ |
| 8 | 1 sem | Testes, Otimizações | ⏳ |
| 9 | 1 sem | Deploy, Entrega | ⏳ |
| **TOTAL** | **7 semanas** | **140 horas** | ⏳ |

---

## 🎯 Próximos Passos

1. Começar pela **Fase 1** (Setup & DB)
2. Seguir a sequência das fases
3. Completar checklist de cada fase antes de avançar
4. Testar continuamente
5. Entregar MVP após Fase 9

**Boa sorte! 🚀**

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  workerProfiles,
  WorkerProfile,
  InsertWorkerProfile,
  clientProfiles,
  ClientProfile,
  InsertClientProfile,
  specialties,
  Specialty,
  serviceRequests,
  ServiceRequest,
  InsertServiceRequest,
  reviews,
  Review,
  InsertReview,
  referrals,
  Referral,
  InsertReferral,
  availability,
  Availability,
  InsertAvailability,
  notifications,
  Notification,
  InsertNotification,
  disputes,
  Dispute,
  InsertDispute,
  serviceHistory,
  InsertServiceHistory,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Haversine distance in kilometers between two lat/lng points.
// Returns undefined if either coordinate is missing, so callers can fall back
// to non-distance-aware ordering.
export function haversineKm(
  a: { lat?: number | null; lng?: number | null } | null | undefined,
  b: { lat?: number | null; lng?: number | null } | null | undefined,
): number | undefined {
  if (!a || !b) return undefined;
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return undefined;
  const R = 6371; // Earth radius in km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// In-memory fallback store for dev mode without DATABASE_URL.
// Lives for the lifetime of the process — restarts clear all data.
const inMem = {
  workerProfiles: new Map<number, WorkerProfile>(),
  clientProfiles: new Map<number, ClientProfile>(),
  specialties: [] as Specialty[],
  serviceRequests: new Map<number, ServiceRequest>(),
  reviews: [] as Review[],
  referrals: new Map<number, Referral>(),
  // Availability keyed by "workerId|YYYY-MM-DD|timeSlot" for fast upserts.
  availability: new Map<string, Availability>(),
  notifications: [] as Notification[],
  disputes: new Map<number, Dispute>(),
  // Maps worker userId → display name for Search results (dev-mode only).
  // The 3 cookie-driven mock users + the static demo workers below all live here.
  userNames: new Map<number, string>(),
  // Override role per userId for dev-mode setUserRole (since the mock users
  // are read-only constants).
  userRoleOverride: new Map<number, "worker" | "client" | "user" | "admin">(),
  nextServiceRequestId: 1,
  nextReviewId: 1,
  nextReferralId: 1,
  nextAvailabilityId: 1,
  nextNotificationId: 1,
  nextDisputeId: 1,
  demoWorkersSeeded: false,
};

// Test-only: wipes the in-memory store between tests so each `it` starts fresh.
// Not exported through index/barrel — direct import only.
export function __resetInMemForTests() {
  inMem.workerProfiles.clear();
  inMem.clientProfiles.clear();
  inMem.specialties = [];
  inMem.serviceRequests.clear();
  inMem.reviews = [];
  inMem.referrals.clear();
  inMem.availability.clear();
  inMem.notifications = [];
  inMem.disputes.clear();
  inMem.userNames.clear();
  inMem.userRoleOverride.clear();
  inMem.nextServiceRequestId = 1;
  inMem.nextReviewId = 1;
  inMem.nextReferralId = 1;
  inMem.nextAvailabilityId = 1;
  inMem.nextNotificationId = 1;
  inMem.nextDisputeId = 1;
  inMem.demoWorkersSeeded = false;
}

// Static demo worker profiles seeded into the in-memory store on first
// `listSpecialties` call. Gives the Search page realistic-looking results in
// dev mode without a real database. Each has stable userIds 9101–9104 that
// don't collide with the cookie-driven mock users (9001/9002/9003).
function seedDemoWorkers() {
  if (inMem.demoWorkersSeeded) return;
  inMem.demoWorkersSeeded = true;
  // Always populate cookie-driven mock user names so admin lookups have
  // labels regardless of test/dev mode.
  inMem.userNames.set(9001, "Novo Usuário");
  inMem.userNames.set(9002, "Trampista Demo");
  inMem.userNames.set(9003, "Padaria Pão Quente (Demo)");
  inMem.userNames.set(9004, "Admin Demo");
  // Skip the demo worker profiles in test env to keep test setups deterministic.
  if (process.env.NODE_ENV === "test") return;
  const now = new Date();
  const demos: Array<WorkerProfile & { userName: string }> = [
    {
      // All three modes — versatile pizzaiolo also open to fixed work.
      id: 9101, userId: 9101, photoUrl: null,
      bio: "Pizzaiolo há 8 anos. Forno a lenha, massa madre, atendimento de balcão. Disponível fim de semana.",
      specialties: [5, 2], city: "Taubaté", latitude: null, longitude: null,
      hourlyRate: "32.00", rating: 4.8, totalReviews: 23, isActive: true,
      acceptsFreela: true, acceptsDiaria: true, acceptsFixa: true,
      professionArea: "Cozinha",
      createdAt: now, updatedAt: now, userName: "Carlos M.",
    },
    {
      // Default modes (freela + diaria only).
      id: 9102, userId: 9102, photoUrl: null,
      bio: "Auxiliar de cozinha + atendente. Trabalhei em padaria e marmitaria. Tô dentro pra encarar prep.",
      specialties: [1, 2], city: "Pindamonhangaba", latitude: null, longitude: null,
      hourlyRate: "26.00", rating: 4.9, totalReviews: 41, isActive: true,
      acceptsFreela: true, acceptsDiaria: true, acceptsFixa: false,
      professionArea: null,
      createdAt: now, updatedAt: now, userName: "Maria C.",
    },
    {
      // Default modes — fast on motorcycle, freelance focus.
      id: 9103, userId: 9103, photoUrl: null,
      bio: "Entregador motorizado, conheço o Vale inteiro. Ágil, educado, capacete e baú próprios.",
      specialties: [6], city: "Caçapava", latitude: null, longitude: null,
      hourlyRate: "22.00", rating: 4.6, totalReviews: 87, isActive: true,
      acceptsFreela: true, acceptsDiaria: true, acceptsFixa: false,
      professionArea: null,
      createdAt: now, updatedAt: now, userName: "João L.",
    },
    {
      // Fixed-job only — appears under "Disposição para Trabalho".
      id: 9104, userId: 9104, photoUrl: null,
      bio: "Garçom de eventos, formado em hospitalidade. Casamentos, formaturas, jantares corporativos. Buscando contratação fixa em hotel ou restaurante.",
      specialties: [3, 9], city: "Taubaté", latitude: null, longitude: null,
      hourlyRate: "38.00", rating: 5.0, totalReviews: 12, isActive: true,
      acceptsFreela: false, acceptsDiaria: false, acceptsFixa: true,
      professionArea: "Hospitalidade e eventos",
      createdAt: now, updatedAt: now, userName: "Ana P.",
    },
    {
      // Fixed-job only — second example for richer CV search.
      id: 9105, userId: 9105, photoUrl: null,
      bio: "Padeiro/confeiteiro. 12 anos em padaria de bairro, especialista em sovados e doces finos. Procurando vaga fixa em padaria estabelecida.",
      specialties: [4], city: "Taubaté", latitude: null, longitude: null,
      hourlyRate: null, rating: 4.7, totalReviews: 19, isActive: true,
      acceptsFreela: false, acceptsDiaria: false, acceptsFixa: true,
      professionArea: "Panificação",
      createdAt: now, updatedAt: now, userName: "Roberto S.",
    },
  ];
  demos.forEach((d) => {
    const { userName, ...profile } = d;
    inMem.workerProfiles.set(d.userId, profile as WorkerProfile);
    inMem.userNames.set(d.userId, userName);
  });
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

// Sets the role for an existing user. Used during onboarding when a "user"
// chooses to become a worker or client. Refuses to demote admins.
export async function setUserRole(userId: number, role: "worker" | "client") {
  const db = await getDb();
  if (!db) {
    // In-memory dev mode: store the override and return a stub user echoing
    // back the change so the client cache can update.
    inMem.userRoleOverride.set(userId, role);
    const now = new Date();
    return {
      id: userId,
      openId: `dev-${role}`,
      name: role === "worker" ? "Trampista Demo" : "Logista Demo",
      email: `${role}@trampei.local`,
      loginMethod: "dev",
      role,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    } as const;
  }
  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existing.length === 0) return undefined;
  if (existing[0].role === "admin") return existing[0];
  await db.update(users).set({ role }).where(eq(users.id, userId));
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Filters for searchWorkers. All optional.
// `mode` filters by acceptance flag:
//   - "gig" (default): trampistas open to freela OR diária — the standard
//     "Buscar profissionais" tab.
//   - "fixa": trampistas open to fixed roles — the "Disposição para Trabalho"
//     tab where companies browse CVs for permanent positions.
//   - "any": ignore mode flags entirely.
export type WorkerSearchFilters = {
  specialtyId?: number;
  city?: string;
  minRating?: number;
  onlyActive?: boolean;
  mode?: "gig" | "fixa" | "any";
  // Optional caller location. When provided, results include `distanceKm`
  // (computed from each worker's lat/lng) and are sorted by a blend of
  // rating and proximity rather than rating alone.
  fromLat?: number;
  fromLng?: number;
  // Hard cap: drop workers farther than this many km. Optional.
  maxKm?: number;
};

export type WorkerSearchResult = WorkerProfile & {
  userName: string | null;
  distanceKm?: number;
};

function workerMatchesMode(w: WorkerProfile, mode: "gig" | "fixa" | "any"): boolean {
  if (mode === "any") return true;
  if (mode === "fixa") return Boolean(w.acceptsFixa);
  // mode === "gig"
  return Boolean(w.acceptsFreela) || Boolean(w.acceptsDiaria);
}

// Searches worker profiles. In dev mode, filters the in-memory store and
// looks up display names from the seeded `userNames` map. In prod, joins
// `worker_profiles` with `users` so the response carries the worker name.
//
// When `fromLat`/`fromLng` are provided, results include `distanceKm` and are
// ranked by `score = rating - distanceKm * 0.02` (penalty of ~0.02★ per km).
// Without geo, falls back to rating-desc.
export async function searchWorkers(filters: WorkerSearchFilters): Promise<WorkerSearchResult[]> {
  const onlyActive = filters.onlyActive ?? true;
  const mode = filters.mode ?? "gig";
  const db = await getDb();
  const from =
    filters.fromLat != null && filters.fromLng != null
      ? { lat: filters.fromLat, lng: filters.fromLng }
      : null;

  const matches = (w: WorkerProfile) => {
    if (onlyActive && !w.isActive) return false;
    if (!workerMatchesMode(w, mode)) return false;
    if (filters.specialtyId != null) {
      const arr = (w.specialties ?? []) as number[];
      if (!arr.includes(filters.specialtyId)) return false;
    }
    if (filters.city && w.city) {
      if (!w.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    }
    if (filters.minRating != null && (w.rating ?? 0) < filters.minRating) return false;
    return true;
  };

  const withDistanceAndRank = (items: WorkerSearchResult[]): WorkerSearchResult[] => {
    if (!from) {
      return items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    const enriched = items.map((w) => ({
      ...w,
      distanceKm: haversineKm(from, { lat: w.latitude, lng: w.longitude }),
    }));
    const capped =
      filters.maxKm != null
        ? enriched.filter(
            (w) => w.distanceKm == null || w.distanceKm <= (filters.maxKm as number),
          )
        : enriched;
    // Rank by rating with a distance penalty. Unknown distance ranks last.
    return capped.sort((a, b) => {
      const ra = a.rating ?? 0;
      const rb = b.rating ?? 0;
      const da = a.distanceKm ?? 1e9;
      const dbb = b.distanceKm ?? 1e9;
      return rb - ra + (da - dbb) * 0.02;
    });
  };

  if (!db) {
    seedDemoWorkers();
    const base = Array.from(inMem.workerProfiles.values())
      .filter(matches)
      .map((w) => ({ ...w, userName: inMem.userNames.get(w.userId) ?? null }));
    return withDistanceAndRank(base);
  }

  const rows = await db
    .select({
      profile: workerProfiles,
      userName: users.name,
    })
    .from(workerProfiles)
    .leftJoin(users, eq(workerProfiles.userId, users.id));

  const base = rows
    .map((r) => ({ ...r.profile, userName: r.userName ?? null }))
    .filter(matches);
  return withDistanceAndRank(base);
}

// Worker profile queries
export async function getWorkerProfile(userId: number) {
  const db = await getDb();
  if (!db) return inMem.workerProfiles.get(userId);
  const result = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Upserts the worker profile by userId. INSERT on first save, UPDATE thereafter.
// `userId` has a UNIQUE constraint, so ON DUPLICATE KEY UPDATE works.
export async function upsertWorkerProfile(userId: number, data: Partial<InsertWorkerProfile>) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const existing = inMem.workerProfiles.get(userId);
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) cleaned[k] = v;
    }
    const updated: WorkerProfile = {
      id: existing?.id ?? userId,
      userId,
      photoUrl: null,
      bio: null,
      specialties: [],
      city: null,
      latitude: null,
      longitude: null,
      hourlyRate: null,
      rating: 0,
      totalReviews: 0,
      isActive: true,
      acceptsFreela: true,
      acceptsDiaria: true,
      acceptsFixa: false,
      professionArea: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...existing,
      ...cleaned,
    } as WorkerProfile;
    inMem.workerProfiles.set(userId, updated);
    return updated;
  }
  // Strip undefined values so we don't overwrite columns the caller didn't touch.
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) cleaned[k] = v;
  }
  await db
    .insert(workerProfiles)
    .values({ userId, ...cleaned } as InsertWorkerProfile)
    .onDuplicateKeyUpdate({ set: cleaned });
  return getWorkerProfile(userId);
}

// Back-compat alias — older code may still call updateWorkerProfile.
export const updateWorkerProfile = upsertWorkerProfile;

// Client profile queries
export async function getClientProfile(userId: number) {
  const db = await getDb();
  if (!db) return inMem.clientProfiles.get(userId);
  const result = await db.select().from(clientProfiles).where(eq(clientProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Upserts the client profile by userId. On first save, `companyName` is
// required (schema NOT NULL); subsequent updates may omit it.
export async function upsertClientProfile(userId: number, data: Partial<InsertClientProfile>) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const existing = inMem.clientProfiles.get(userId);
    if (!existing && !data.companyName) {
      throw new Error("companyName is required on first client profile save");
    }
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) cleaned[k] = v;
    }
    const updated: ClientProfile = {
      id: existing?.id ?? userId,
      userId,
      companyName: data.companyName ?? existing?.companyName ?? "",
      phone: null,
      city: null,
      latitude: null,
      longitude: null,
      rating: 0,
      totalReviews: 0,
      subscriptionPlan: "basic",
      subscriptionExpiresAt: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...existing,
      ...cleaned,
    } as ClientProfile;
    inMem.clientProfiles.set(userId, updated);
    return updated;
  }
  const existing = await getClientProfile(userId);
  if (!existing && !data.companyName) {
    throw new Error("companyName is required on first client profile save");
  }
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) cleaned[k] = v;
  }
  await db
    .insert(clientProfiles)
    .values({ userId, ...cleaned } as InsertClientProfile)
    .onDuplicateKeyUpdate({ set: cleaned });
  return getClientProfile(userId);
}

export const updateClientProfile = upsertClientProfile;

// Specialty queries
const DEFAULT_SPECIALTIES: { name: string; description: string }[] = [
  { name: "Auxiliar de cozinha", description: "Preparo, mise en place, montagem de pratos" },
  { name: "Atendente", description: "Balcão, salão, drive-thru, caixa" },
  { name: "Garçom / Garçonete", description: "Serviço de mesa e atendimento ao cliente" },
  { name: "Padeiro / Confeiteiro", description: "Pães, salgados, doces, confeitaria" },
  { name: "Pizzaiolo", description: "Montagem e forno de pizzas" },
  { name: "Entregador", description: "Delivery a pé, moto ou bike" },
  { name: "Repositor", description: "Reposição de estoque em mercado" },
  { name: "Operador de caixa", description: "Frente de caixa, recebimento" },
  { name: "Auxiliar de eventos", description: "Montagem, copa, recepção em eventos" },
  { name: "Ajudante de construção", description: "Pedreiro, servente, ajudante geral" },
  { name: "Auxiliar de logística", description: "Carga, descarga, conferência" },
  { name: "Faxina / Limpeza", description: "Limpeza pós-evento, faxina geral" },
];

// Lists specialties; lazy-seeds the table with defaults on the first call when
// the table is empty so dev environments work without manual seeding.
export async function listSpecialties() {
  const db = await getDb();
  if (!db) {
    if (inMem.specialties.length === 0) {
      const now = new Date();
      inMem.specialties = DEFAULT_SPECIALTIES.map((s, i) => ({
        id: i + 1,
        name: s.name,
        description: s.description,
        icon_url: null,
        createdAt: now,
      }));
    }
    seedDemoWorkers();
    return inMem.specialties;
  }
  let rows = await db.select().from(specialties);
  if (rows.length === 0) {
    try {
      await db.insert(specialties).values(DEFAULT_SPECIALTIES);
      rows = await db.select().from(specialties);
    } catch (error) {
      console.warn("[Database] Failed to seed specialties:", error);
    }
  }
  return rows;
}

// Service request queries
export async function createServiceRequest(data: InsertServiceRequest) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const id = inMem.nextServiceRequestId++;
    const created: ServiceRequest = {
      id,
      clientId: data.clientId,
      workerId: data.workerId ?? null,
      specialtyId: data.specialtyId,
      title: data.title,
      description: data.description ?? null,
      urgencyLevel: data.urgencyLevel ?? "medium",
      status: data.status ?? "requested",
      scheduledDate: data.scheduledDate ?? null,
      scheduledTime: data.scheduledTime ?? null,
      locationLatitude: data.locationLatitude ?? null,
      locationLongitude: data.locationLongitude ?? null,
      estimatedDurationMinutes: data.estimatedDurationMinutes ?? null,
      proposedPrice: data.proposedPrice ?? null,
      finalPrice: data.finalPrice ?? null,
      createdAt: now,
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
    };
    inMem.serviceRequests.set(id, created);
    return created;
  }
  const result = await db.insert(serviceRequests).values(data);
  return result;
}

export async function getServiceRequest(id: number) {
  const db = await getDb();
  if (!db) return inMem.serviceRequests.get(id);
  const result = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateServiceRequest(id: number, data: Partial<InsertServiceRequest>) {
  const db = await getDb();
  if (!db) {
    const existing = inMem.serviceRequests.get(id);
    if (!existing) return undefined;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) cleaned[k] = v;
    }
    const updated = { ...existing, ...cleaned } as ServiceRequest;
    inMem.serviceRequests.set(id, updated);
    return updated;
  }
  await db.update(serviceRequests).set(data).where(eq(serviceRequests.id, id));
  return getServiceRequest(id);
}

// ServiceRequest enriched with the assigned worker's display name + userId so
// the client dashboard can link directly to the trampista's currículo.
export type ClientRequestWithWorker = ServiceRequest & {
  workerName: string | null;
  workerUserId: number | null;
};

export async function listServiceRequestsForClient(
  clientProfileId: number,
): Promise<ClientRequestWithWorker[]> {
  const db = await getDb();

  const enrich = async (
    request: ServiceRequest,
  ): Promise<ClientRequestWithWorker> => {
    if (request.workerId == null) {
      return { ...request, workerName: null, workerUserId: null };
    }
    const userId = await getWorkerProfileUserId(request.workerId);
    return {
      ...request,
      workerUserId: userId ?? null,
      workerName: userId ? inMem.userNames.get(userId) ?? null : null,
    };
  };

  if (!db) {
    const rows = Array.from(inMem.serviceRequests.values())
      .filter((r) => r.clientId === clientProfileId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return Promise.all(rows.map(enrich));
  }

  // Prod path: join worker_profiles + users so we don't fan out N+1.
  const rows = await db
    .select({
      request: serviceRequests,
      workerUserId: workerProfiles.userId,
      workerName: users.name,
    })
    .from(serviceRequests)
    .leftJoin(workerProfiles, eq(serviceRequests.workerId, workerProfiles.id))
    .leftJoin(users, eq(workerProfiles.userId, users.id))
    .where(eq(serviceRequests.clientId, clientProfileId))
    .orderBy(desc(serviceRequests.createdAt));

  return rows.map((r) => ({
    ...r.request,
    workerName: r.workerName ?? null,
    workerUserId: r.workerUserId ?? null,
  }));
}

export type RequestForWorker = ServiceRequest & { distanceKm?: number };

const URGENCY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function rankOpenForWorker(
  requests: ServiceRequest[],
  workerLoc: { lat?: number | null; lng?: number | null } | null,
): RequestForWorker[] {
  return requests
    .map((r) => ({
      ...r,
      distanceKm: haversineKm(workerLoc, {
        lat: r.locationLatitude,
        lng: r.locationLongitude,
      }),
    }))
    .sort((a, b) => {
      // Urgência primeiro (critical → low), depois distância crescente.
      const ua = URGENCY_RANK[a.urgencyLevel ?? "medium"] ?? 2;
      const ub = URGENCY_RANK[b.urgencyLevel ?? "medium"] ?? 2;
      if (ua !== ub) return ua - ub;
      const da = a.distanceKm ?? 1e9;
      const dbb = b.distanceKm ?? 1e9;
      return da - dbb;
    });
}

export async function listServiceRequestsForWorker(
  userId: number,
): Promise<RequestForWorker[]> {
  const db = await getDb();
  if (!db) {
    const profile = inMem.workerProfiles.get(userId);
    if (!profile) return [];
    const workerLoc = { lat: profile.latitude, lng: profile.longitude };
    const all = Array.from(inMem.serviceRequests.values());
    const assigned = all
      .filter((r) => r.workerId === profile.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((r) => ({
        ...r,
        distanceKm: haversineKm(workerLoc, {
          lat: r.locationLatitude,
          lng: r.locationLongitude,
        }),
      }));
    const workerSpecialties = (profile.specialties ?? []) as number[];
    const open =
      workerSpecialties.length > 0
        ? rankOpenForWorker(
            all.filter(
              (r) =>
                r.workerId === null &&
                r.status === "requested" &&
                workerSpecialties.includes(r.specialtyId),
            ),
            workerLoc,
          )
        : [];
    return [...assigned, ...open];
  }

  const profile = await getWorkerProfile(userId);
  if (!profile) return [];
  const workerLoc = { lat: profile.latitude, lng: profile.longitude };

  const assignedRaw = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.workerId, profile.id))
    .orderBy(desc(serviceRequests.createdAt));
  const assigned: RequestForWorker[] = assignedRaw.map((r) => ({
    ...r,
    distanceKm: haversineKm(workerLoc, {
      lat: r.locationLatitude,
      lng: r.locationLongitude,
    }),
  }));

  const workerSpecialties = (profile.specialties ?? []) as number[];
  if (workerSpecialties.length === 0) return assigned;

  const openRaw = await db
    .select()
    .from(serviceRequests)
    .where(
      and(
        isNull(serviceRequests.workerId),
        eq(serviceRequests.status, "requested"),
        inArray(serviceRequests.specialtyId, workerSpecialties),
      ),
    );

  return [...assigned, ...rankOpenForWorker(openRaw, workerLoc)];
}

// Claims an open request for a worker. Returns the updated row, or undefined
// if the request was already taken (concurrent accept) or doesn't exist.
export async function acceptServiceRequest(workerProfileId: number, requestId: number) {
  const db = await getDb();
  if (!db) {
    const req = inMem.serviceRequests.get(requestId);
    if (!req || req.workerId !== null || req.status !== "requested") return undefined;
    const updated: ServiceRequest = {
      ...req,
      workerId: workerProfileId,
      status: "accepted",
      acceptedAt: new Date(),
    };
    inMem.serviceRequests.set(requestId, updated);
    return updated;
  }

  await db
    .update(serviceRequests)
    .set({
      workerId: workerProfileId,
      status: "accepted",
      acceptedAt: new Date(),
    })
    .where(
      and(
        eq(serviceRequests.id, requestId),
        isNull(serviceRequests.workerId),
        eq(serviceRequests.status, "requested"),
      ),
    );

  const updated = await getServiceRequest(requestId);
  if (!updated || updated.workerId !== workerProfileId) return undefined;
  return updated;
}

// Referral queries — trampista cadastra um logista que indicou.
export async function createReferral(data: InsertReferral): Promise<Referral | undefined> {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const id = inMem.nextReferralId++;
    const created: Referral = {
      id,
      trampistaUserId: data.trampistaUserId,
      clientUserId: data.clientUserId ?? null,
      clientCompanyName: data.clientCompanyName,
      clientContact: data.clientContact ?? null,
      planChosen: data.planChosen ?? "basico",
      firstPaymentAmount: data.firstPaymentAmount ?? null,
      status: data.status ?? "pending",
      notes: data.notes ?? null,
      createdAt: now,
      activatedAt: null,
      paidAt: null,
    };
    inMem.referrals.set(id, created);
    return created;
  }
  const result = await db.insert(referrals).values(data);
  const insertId = (result as unknown as { insertId?: number })?.insertId;
  if (!insertId) return undefined;
  const rows = await db.select().from(referrals).where(eq(referrals.id, insertId)).limit(1);
  return rows[0];
}

export async function listReferralsByTrampista(trampistaUserId: number): Promise<Referral[]> {
  const db = await getDb();
  if (!db) {
    return Array.from(inMem.referrals.values())
      .filter((r) => r.trampistaUserId === trampistaUserId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  return db
    .select()
    .from(referrals)
    .where(eq(referrals.trampistaUserId, trampistaUserId))
    .orderBy(desc(referrals.createdAt));
}

// Updates the status of a referral and stamps the appropriate lifecycle
// timestamp. Returns the updated row, or undefined if not found.
//
// Authorization is checked by the caller (router): in production only admins
// should advance status; in dev the trampista who owns the referral is also
// allowed so the demo can show the full lifecycle.
export async function updateReferralStatus(
  referralId: number,
  newStatus: "pending" | "active" | "paid" | "cancelled",
): Promise<Referral | undefined> {
  const db = await getDb();
  const now = new Date();

  if (!db) {
    const existing = inMem.referrals.get(referralId);
    if (!existing) return undefined;
    const updated: Referral = {
      ...existing,
      status: newStatus,
      activatedAt:
        newStatus === "active" && !existing.activatedAt ? now : existing.activatedAt,
      paidAt: newStatus === "paid" && !existing.paidAt ? now : existing.paidAt,
    };
    inMem.referrals.set(referralId, updated);
    return updated;
  }

  const existing = await db
    .select()
    .from(referrals)
    .where(eq(referrals.id, referralId))
    .limit(1);
  if (existing.length === 0) return undefined;
  const cur = existing[0];

  await db
    .update(referrals)
    .set({
      status: newStatus,
      activatedAt: newStatus === "active" && !cur.activatedAt ? now : cur.activatedAt,
      paidAt: newStatus === "paid" && !cur.paidAt ? now : cur.paidAt,
    })
    .where(eq(referrals.id, referralId));

  const rows = await db.select().from(referrals).where(eq(referrals.id, referralId)).limit(1);
  return rows[0];
}

export async function getReferral(referralId: number): Promise<Referral | undefined> {
  const db = await getDb();
  if (!db) return inMem.referrals.get(referralId);
  const rows = await db.select().from(referrals).where(eq(referrals.id, referralId)).limit(1);
  return rows[0];
}

// Aggregate stats for a trampista's referral dashboard.
export async function getReferralStats(trampistaUserId: number) {
  const all = await listReferralsByTrampista(trampistaUserId);
  const byStatus = {
    pending: all.filter((r) => r.status === "pending").length,
    active: all.filter((r) => r.status === "active").length,
    paid: all.filter((r) => r.status === "paid").length,
    cancelled: all.filter((r) => r.status === "cancelled").length,
  };
  const totalEarned = all
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + (r.firstPaymentAmount ? Number(r.firstPaymentAmount) : 0), 0);
  return { total: all.length, byStatus, totalEarned };
}

// Admin view: every referral across the platform, with the trampista's
// display name joined in. In dev/in-memory mode, looks up name from the
// `userNames` map (which has dev mocks + demo workers). In prod, joins users.
export type ReferralWithTrampista = Referral & {
  trampistaName: string | null;
  trampistaEmail: string | null;
};

export async function listAllReferrals(
  statusFilter?: "pending" | "active" | "paid" | "cancelled",
): Promise<ReferralWithTrampista[]> {
  const db = await getDb();
  if (!db) {
    seedDemoWorkers(); // ensure userNames map is populated for trampista labels
    return Array.from(inMem.referrals.values())
      .filter((r) => !statusFilter || r.status === statusFilter)
      .map((r) => ({
        ...r,
        trampistaName: inMem.userNames.get(r.trampistaUserId) ?? null,
        trampistaEmail: null,
      }))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  const rows = await db
    .select({
      referral: referrals,
      trampistaName: users.name,
      trampistaEmail: users.email,
    })
    .from(referrals)
    .leftJoin(users, eq(referrals.trampistaUserId, users.id))
    .orderBy(desc(referrals.createdAt));
  return rows
    .map((r) => ({
      ...r.referral,
      trampistaName: r.trampistaName ?? null,
      trampistaEmail: r.trampistaEmail ?? null,
    }))
    .filter((r) => !statusFilter || r.status === statusFilter);
}

// Platform-wide referral stats (all trampistas combined). Used by the admin
// dashboard to show ops a single pane of glass.
export async function getGlobalReferralStats() {
  const all = await listAllReferrals();
  const byStatus = {
    pending: all.filter((r) => r.status === "pending").length,
    active: all.filter((r) => r.status === "active").length,
    paid: all.filter((r) => r.status === "paid").length,
    cancelled: all.filter((r) => r.status === "cancelled").length,
  };
  const totalCommissionsPaid = all
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + (r.firstPaymentAmount ? Number(r.firstPaymentAmount) : 0), 0);
  const totalPipelineValue = all
    .filter((r) => r.status === "pending" || r.status === "active")
    .reduce((sum, r) => sum + (r.firstPaymentAmount ? Number(r.firstPaymentAmount) : 0), 0);
  return {
    total: all.length,
    byStatus,
    totalCommissionsPaid,
    totalPipelineValue,
    uniqueTrampistas: new Set(all.map((r) => r.trampistaUserId)).size,
  };
}

// Availability queries — workers carve up their week into 4 slots per day
// (morning/afternoon/evening/night) and toggle each one on/off.
export type TimeSlot = "morning" | "afternoon" | "evening" | "night";

function dateKey(date: Date): string {
  // ISO YYYY-MM-DD in UTC. Avoids TZ drift across the map key.
  return date.toISOString().slice(0, 10);
}

function availabilityKey(workerId: number, date: Date, timeSlot: TimeSlot) {
  return `${workerId}|${dateKey(date)}|${timeSlot}`;
}

export async function listAvailabilityForWorker(
  workerProfileId: number,
  fromDate: Date,
  toDate: Date,
): Promise<Availability[]> {
  const db = await getDb();
  if (!db) {
    return Array.from(inMem.availability.values()).filter((a) => {
      if (a.workerId !== workerProfileId) return false;
      const d = new Date(a.date);
      return d >= fromDate && d <= toDate;
    });
  }
  // No date-range narrowing in the SQL path yet; fetch all for this worker
  // and filter in JS. Fine for MVP since rows-per-worker stays small.
  const rows = await db
    .select()
    .from(availability)
    .where(eq(availability.workerId, workerProfileId));
  return rows.filter((a) => {
    const d = new Date(a.date);
    return d >= fromDate && d <= toDate;
  });
}

export async function setAvailability(
  workerProfileId: number,
  date: Date,
  timeSlot: TimeSlot,
  isAvailable: boolean,
): Promise<Availability> {
  const db = await getDb();
  if (!db) {
    const key = availabilityKey(workerProfileId, date, timeSlot);
    const existing = inMem.availability.get(key);
    const updated: Availability = {
      id: existing?.id ?? inMem.nextAvailabilityId++,
      workerId: workerProfileId,
      date,
      timeSlot,
      isAvailable,
      updatedAt: new Date(),
    };
    inMem.availability.set(key, updated);
    return updated;
  }

  // MySQL doesn't have a clean unique on (workerId, date, timeSlot), so we
  // try-update then insert.
  const existing = await db
    .select()
    .from(availability)
    .where(eq(availability.workerId, workerProfileId));
  const match = existing.find((a) => {
    const sameDay = dateKey(new Date(a.date)) === dateKey(date);
    return sameDay && a.timeSlot === timeSlot;
  });
  if (match) {
    await db
      .update(availability)
      .set({ isAvailable })
      .where(eq(availability.id, match.id));
    return { ...match, isAvailable, updatedAt: new Date() };
  }
  await db.insert(availability).values({
    workerId: workerProfileId,
    date,
    timeSlot,
    isAvailable,
  });
  // Return a synthetic row — close enough for the client to update its cache.
  return {
    id: 0,
    workerId: workerProfileId,
    date,
    timeSlot,
    isAvailable,
    updatedAt: new Date(),
  };
}

// =============================================================================
// Disputes
// =============================================================================

export async function createDispute(data: InsertDispute): Promise<Dispute | undefined> {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const created: Dispute = {
      id: inMem.nextDisputeId++,
      serviceRequestId: data.serviceRequestId,
      openedByUserId: data.openedByUserId,
      reason: data.reason,
      severity: data.severity ?? "medium",
      status: "open",
      resolution: null,
      resolvedByUserId: null,
      createdAt: now,
      resolvedAt: null,
    };
    inMem.disputes.set(created.id, created);
    return created;
  }
  await db.insert(disputes).values(data);
  return undefined;
}

export async function listDisputesByUser(userId: number): Promise<Dispute[]> {
  const db = await getDb();
  if (!db) {
    return Array.from(inMem.disputes.values())
      .filter((d) => d.openedByUserId === userId)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  return db
    .select()
    .from(disputes)
    .where(eq(disputes.openedByUserId, userId))
    .orderBy(desc(disputes.createdAt));
}

export type DisputeWithRequest = Dispute & {
  requestTitle: string | null;
  openedByName: string | null;
};

export async function listAllDisputes(
  statusFilter?: "open" | "resolved" | "dismissed",
): Promise<DisputeWithRequest[]> {
  const db = await getDb();
  if (!db) {
    return Array.from(inMem.disputes.values())
      .filter((d) => !statusFilter || d.status === statusFilter)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((d) => {
        const req = inMem.serviceRequests.get(d.serviceRequestId);
        return {
          ...d,
          requestTitle: req?.title ?? null,
          openedByName: inMem.userNames.get(d.openedByUserId) ?? null,
        };
      });
  }
  const rows = await db
    .select({
      dispute: disputes,
      requestTitle: serviceRequests.title,
      openedByName: users.name,
    })
    .from(disputes)
    .leftJoin(serviceRequests, eq(disputes.serviceRequestId, serviceRequests.id))
    .leftJoin(users, eq(disputes.openedByUserId, users.id))
    .orderBy(desc(disputes.createdAt));
  return rows
    .map((r) => ({
      ...r.dispute,
      requestTitle: r.requestTitle ?? null,
      openedByName: r.openedByName ?? null,
    }))
    .filter((d) => !statusFilter || d.status === statusFilter);
}

export async function getDispute(id: number): Promise<Dispute | undefined> {
  const db = await getDb();
  if (!db) return inMem.disputes.get(id);
  const rows = await db.select().from(disputes).where(eq(disputes.id, id)).limit(1);
  return rows[0];
}

export async function resolveDispute(
  disputeId: number,
  resolvedByUserId: number,
  newStatus: "resolved" | "dismissed",
  resolution: string,
): Promise<Dispute | undefined> {
  const db = await getDb();
  const now = new Date();
  if (!db) {
    const existing = inMem.disputes.get(disputeId);
    if (!existing) return undefined;
    const updated: Dispute = {
      ...existing,
      status: newStatus,
      resolution,
      resolvedByUserId,
      resolvedAt: now,
    };
    inMem.disputes.set(disputeId, updated);
    return updated;
  }
  await db
    .update(disputes)
    .set({ status: newStatus, resolution, resolvedByUserId, resolvedAt: now })
    .where(eq(disputes.id, disputeId));
  return getDispute(disputeId);
}

// =============================================================================
// In-app notifications
// =============================================================================

export type NotificationType =
  | "new_request_match"
  | "request_accepted"
  | "request_in_progress"
  | "request_completed"
  | "request_cancelled_by_client"
  | "worker_dropped"
  | "review_received"
  | "referral_active"
  | "referral_paid";

export async function createNotification(
  data: InsertNotification,
): Promise<Notification | undefined> {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const created: Notification = {
      id: inMem.nextNotificationId++,
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      linkPath: data.linkPath ?? null,
      relatedId: data.relatedId ?? null,
      read: data.read ?? false,
      createdAt: now,
    };
    inMem.notifications.push(created);
    return created;
  }
  await db.insert(notifications).values(data);
  return undefined;
}

export async function listNotificationsForUser(
  userId: number,
  options?: { onlyUnread?: boolean; limit?: number },
): Promise<Notification[]> {
  const db = await getDb();
  const limit = options?.limit ?? 50;
  const onlyUnread = options?.onlyUnread ?? false;
  if (!db) {
    let rows = inMem.notifications.filter((n) => n.userId === userId);
    if (onlyUnread) rows = rows.filter((n) => !n.read);
    return rows
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, limit);
  }
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
  return (onlyUnread ? rows.filter((n) => !n.read) : rows).slice(0, limit);
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const all = await listNotificationsForUser(userId, { onlyUnread: true, limit: 9999 });
  return all.length;
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    const target = inMem.notifications.find(
      (n) => n.id === notificationId && n.userId === userId,
    );
    if (target) target.read = true;
    return target;
  }
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));
  return undefined;
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) {
    inMem.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
    return;
  }
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, userId));
}

// Convenience: find every worker whose specialty array includes `specialtyId`
// and who is active. Used to fan out new-request notifications.
export async function findWorkerUserIdsForSpecialty(specialtyId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) {
    return Array.from(inMem.workerProfiles.values())
      .filter((w) => {
        if (!w.isActive) return false;
        const arr = (w.specialties ?? []) as number[];
        return arr.includes(specialtyId) && (w.acceptsFreela || w.acceptsDiaria);
      })
      .map((w) => w.userId);
  }
  const rows = await db.select().from(workerProfiles);
  return rows
    .filter((w) => {
      if (!w.isActive) return false;
      const arr = (w.specialties ?? []) as number[];
      return arr.includes(specialtyId) && (w.acceptsFreela || w.acceptsDiaria);
    })
    .map((w) => w.userId);
}

// Public-facing worker profile: sanitized fields only (no email, no exact
// coordinates) plus the user's display name and recent reviews. Used by the
// shareable `/trampista/:userId` page that doesn't require login.
export type PublicWorkerProfile = {
  userId: number;
  userName: string | null;
  photoUrl: string | null;
  bio: string | null;
  city: string | null;
  specialties: number[];
  rating: number;
  totalReviews: number;
  hourlyRate: string | null;
  professionArea: string | null;
  acceptsFreela: boolean;
  acceptsDiaria: boolean;
  acceptsFixa: boolean;
  isActive: boolean;
  // CV stats: how many gigs this worker actually closed + when they joined.
  // Surfaced on the currículo page so logistas see substance, not just stars.
  completedJobs: number;
  memberSince: Date;
  // Last few reviews, anonymized (no reviewer id surfaced).
  recentReviews: Array<{
    rating: number;
    comment: string | null;
    createdAt: Date;
  }>;
};

export async function getPublicWorkerProfile(
  userId: number,
): Promise<PublicWorkerProfile | undefined> {
  const db = await getDb();
  let profile: WorkerProfile | undefined;
  let userName: string | null = null;

  if (!db) {
    seedDemoWorkers();
    profile = inMem.workerProfiles.get(userId);
    if (!profile) return undefined;
    userName = inMem.userNames.get(userId) ?? null;
  } else {
    const rows = await db
      .select({ profile: workerProfiles, userName: users.name })
      .from(workerProfiles)
      .leftJoin(users, eq(workerProfiles.userId, users.id))
      .where(eq(workerProfiles.userId, userId))
      .limit(1);
    if (rows.length === 0) return undefined;
    profile = rows[0].profile;
    userName = rows[0].userName ?? null;
  }

  const userReviews = await getReviewsForUser(userId);
  const recentReviews = userReviews
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 10)
    .map((r) => ({
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    }));

  // Count completed gigs that this worker actually closed.
  let completedJobs = 0;
  if (!db) {
    completedJobs = Array.from(inMem.serviceRequests.values()).filter(
      (r) => r.workerId === profile.id && r.status === "completed",
    ).length;
  } else {
    const completed = await db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.workerId, profile.id),
          eq(serviceRequests.status, "completed"),
        ),
      );
    completedJobs = completed.length;
  }

  return {
    userId: profile.userId,
    userName,
    photoUrl: profile.photoUrl,
    bio: profile.bio,
    city: profile.city,
    specialties: (profile.specialties ?? []) as number[],
    rating: profile.rating ?? 0,
    totalReviews: profile.totalReviews ?? 0,
    hourlyRate: profile.hourlyRate,
    professionArea: profile.professionArea,
    acceptsFreela: profile.acceptsFreela ?? true,
    acceptsDiaria: profile.acceptsDiaria ?? true,
    acceptsFixa: profile.acceptsFixa ?? false,
    isActive: profile.isActive ?? true,
    completedJobs,
    memberSince: profile.createdAt,
    recentReviews,
  };
}

// Lookup helper: clientProfile.id → clientProfile.userId (for notifying the
// client by their user identity, not their profile identity).
export async function getClientProfileUserId(clientProfileId: number): Promise<number | undefined> {
  const db = await getDb();
  if (!db) {
    const profile = Array.from(inMem.clientProfiles.values()).find(
      (p) => p.id === clientProfileId,
    );
    return profile?.userId;
  }
  const rows = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.id, clientProfileId))
    .limit(1);
  return rows[0]?.userId;
}

// Same pattern for workerProfile.
export async function getWorkerProfileUserId(workerProfileId: number): Promise<number | undefined> {
  const db = await getDb();
  if (!db) {
    const profile = Array.from(inMem.workerProfiles.values()).find(
      (p) => p.id === workerProfileId,
    );
    return profile?.userId;
  }
  const rows = await db
    .select()
    .from(workerProfiles)
    .where(eq(workerProfiles.id, workerProfileId))
    .limit(1);
  return rows[0]?.userId;
}

// Review queries
export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) {
    const now = new Date();
    const id = inMem.nextReviewId++;
    const created: Review = {
      id,
      serviceRequestId: data.serviceRequestId,
      reviewerId: data.reviewerId,
      reviewedUserId: data.reviewedUserId,
      rating: data.rating,
      comment: data.comment ?? null,
      createdAt: now,
    };
    inMem.reviews.push(created);
    return created;
  }
  return db.insert(reviews).values(data);
}

export async function getReviewsForUser(userId: number) {
  const db = await getDb();
  if (!db) return inMem.reviews.filter((r) => r.reviewedUserId === userId);
  return db.select().from(reviews).where(eq(reviews.reviewedUserId, userId));
}

// Lists all reviews tied to a given service request (max 2 in practice — one
// from each party).
export async function getReviewsForRequest(requestId: number) {
  const db = await getDb();
  if (!db) return inMem.reviews.filter((r) => r.serviceRequestId === requestId);
  return db.select().from(reviews).where(eq(reviews.serviceRequestId, requestId));
}

// Lists every review authored by a given user. Used by dashboards to flag
// which completed requests are still pending a review from this user.
export async function getReviewsByReviewer(reviewerId: number) {
  const db = await getDb();
  if (!db) return inMem.reviews.filter((r) => r.reviewerId === reviewerId);
  return db.select().from(reviews).where(eq(reviews.reviewerId, reviewerId));
}

// Recomputes the aggregate rating + totalReviews for a user and stores it on
// whichever profile (worker or client) they own. Idempotent; safe to call
// after every review insert.
export async function recomputeUserRating(userId: number) {
  const userReviews = await getReviewsForUser(userId);
  const total = userReviews.length;
  const rating = total === 0 ? 0 : userReviews.reduce((s, r) => s + r.rating, 0) / total;

  const worker = await getWorkerProfile(userId);
  if (worker) {
    await upsertWorkerProfile(userId, { rating, totalReviews: total } as Partial<InsertWorkerProfile>);
    return;
  }
  const client = await getClientProfile(userId);
  if (client) {
    await upsertClientProfile(userId, { rating, totalReviews: total } as Partial<InsertClientProfile>);
  }
}

// Looks up the userId on the other side of a service request from the
// perspective of the caller. Used by review.createForRequest to derive the
// reviewedUserId without trusting the client.
export async function getCounterpartyUserId(
  requestId: number,
  currentUserId: number,
): Promise<number | undefined> {
  const req = await getServiceRequest(requestId);
  if (!req) return undefined;

  const clientProfile = await (async () => {
    const db = await getDb();
    if (!db) {
      return Array.from(inMem.clientProfiles.values()).find((p) => p.id === req.clientId);
    }
    const rows = await db.select().from(clientProfiles).where(eq(clientProfiles.id, req.clientId)).limit(1);
    return rows[0];
  })();

  const workerProfile = req.workerId
    ? await (async () => {
        const db = await getDb();
        if (!db) {
          return Array.from(inMem.workerProfiles.values()).find((p) => p.id === req.workerId);
        }
        const rows = await db
          .select()
          .from(workerProfiles)
          .where(eq(workerProfiles.id, req.workerId!))
          .limit(1);
        return rows[0];
      })()
    : undefined;

  if (clientProfile?.userId === currentUserId) return workerProfile?.userId;
  if (workerProfile?.userId === currentUserId) return clientProfile?.userId;
  return undefined;
}

import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  json,
  boolean,
  datetime,
  float,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role field for client/worker distinction.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "client", "worker", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Specialties catalog
 */
export const specialties = mysqlTable("specialties", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon_url: text("icon_url"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Specialty = typeof specialties.$inferSelect;
export type InsertSpecialty = typeof specialties.$inferInsert;

/**
 * Worker profiles
 *
 * Trampistas accept work in three modalities, tracked as independent booleans
 * (a trampista can opt into any combination):
 *   - acceptsFreela: emergency / urgent gigs (default true)
 *   - acceptsDiaria: pre-scheduled daily shifts (default true)
 *   - acceptsFixa:   permanent / fixed positions; the trampista's profile
 *                    surfaces in the "Disposição para Trabalho" CV search
 *                    when this is true (default false)
 * `professionArea` is a free-text label (e.g. "Cozinha", "Atendimento",
 * "Padaria") used alongside specialties to help logistas browse CVs.
 */
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
  acceptsFreela: boolean("acceptsFreela").default(true),
  acceptsDiaria: boolean("acceptsDiaria").default(true),
  acceptsFixa: boolean("acceptsFixa").default(false),
  professionArea: varchar("professionArea", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkerProfile = typeof workerProfiles.$inferSelect;
export type InsertWorkerProfile = typeof workerProfiles.$inferInsert;

/**
 * Client profiles
 */
export const clientProfiles = mysqlTable("client_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  companyName: varchar("companyName", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  city: varchar("city", { length: 100 }),
  latitude: float("latitude"),
  longitude: float("longitude"),
  rating: float("rating").default(0),
  totalReviews: int("totalReviews").default(0),
  subscriptionPlan: mysqlEnum("subscriptionPlan", ["basic", "premium", "enterprise"]).default("basic"),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientProfile = typeof clientProfiles.$inferSelect;
export type InsertClientProfile = typeof clientProfiles.$inferInsert;

/**
 * Worker availability (dynamic)
 */
export const availability = mysqlTable("availability", {
  id: int("id").autoincrement().primaryKey(),
  workerId: int("workerId").notNull(),
  date: datetime("date").notNull(),
  timeSlot: mysqlEnum("timeSlot", ["morning", "afternoon", "evening", "night"]),
  isAvailable: boolean("isAvailable").default(true),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = typeof availability.$inferInsert;

/**
 * Service requests
 */
export const serviceRequests = mysqlTable("service_requests", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  workerId: int("workerId"),
  specialtyId: int("specialtyId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  urgencyLevel: mysqlEnum("urgencyLevel", ["low", "medium", "high", "critical"]).default("medium"),
  status: mysqlEnum("status", ["requested", "accepted", "in_progress", "completed", "cancelled"]).default("requested"),
  scheduledDate: datetime("scheduledDate"),
  scheduledTime: varchar("scheduledTime", { length: 10 }),
  locationLatitude: float("locationLatitude"),
  locationLongitude: float("locationLongitude"),
  estimatedDurationMinutes: int("estimatedDurationMinutes"),
  proposedPrice: decimal("proposedPrice", { precision: 10, scale: 2 }),
  finalPrice: decimal("finalPrice", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
});

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;

/**
 * Reviews and ratings
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  serviceRequestId: int("serviceRequestId").notNull(),
  reviewerId: int("reviewerId").notNull(),
  reviewedUserId: int("reviewedUserId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Referrals — when a trampista signs up a logista and closes the plan sale,
 * the first monthly subscription payment goes entirely to the trampista as
 * commission. Each row tracks one referral relationship and its lifecycle.
 *
 * Status flow: `pending` (trampista just registered the lead)
 *           → `active` (logista signed up and chose a plan)
 *           → `paid`   (first month invoiced; commission released to trampista)
 *           → `cancelled` (logista cancelled before first payment)
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  // The trampista who brought in the deal (users.id).
  trampistaUserId: int("trampistaUserId").notNull(),
  // Optional — set once the logista has a Trampei account.
  clientUserId: int("clientUserId"),
  clientCompanyName: varchar("clientCompanyName", { length: 200 }).notNull(),
  clientContact: varchar("clientContact", { length: 200 }),
  planChosen: mysqlEnum("planChosen", ["basico", "pro", "premiere"]).default("basico"),
  firstPaymentAmount: decimal("firstPaymentAmount", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["pending", "active", "paid", "cancelled"]).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  activatedAt: timestamp("activatedAt"),
  paidAt: timestamp("paidAt"),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

/**
 * Disputes — opened by client or worker when a service request goes wrong.
 * Admin resolves with notes. Visible to involved parties + admins only.
 *
 * Severity guides triage urgency: `low` = informativo, `medium` = revisar,
 * `high` = action needed soon, `critical` = bloqueador / fraude possível.
 */
export const disputes = mysqlTable("disputes", {
  id: int("id").autoincrement().primaryKey(),
  serviceRequestId: int("serviceRequestId").notNull(),
  openedByUserId: int("openedByUserId").notNull(),
  reason: text("reason").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium"),
  status: mysqlEnum("status", ["open", "resolved", "dismissed"]).default("open"),
  resolution: text("resolution"),
  resolvedByUserId: int("resolvedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = typeof disputes.$inferInsert;

/**
 * In-app notifications — one row per delivered notice to a recipient user.
 * Emitted server-side from procedure handlers (accept, status change, review,
 * etc). The bell icon in AppLayout polls listMine + countUnread.
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "new_request_match",     // worker: nova vaga compatível com suas especialidades
    "request_accepted",      // client: alguém aceitou sua solicitação
    "request_in_progress",   // client: trampista começou
    "request_completed",     // client: trampo concluído
    "request_cancelled_by_client", // worker: cliente cancelou
    "worker_dropped",        // client: trampista desistiu, vaga voltou pra fila
    "review_received",       // either: ganhou avaliação
    "referral_active",       // worker: logista indicado assinou
    "referral_paid",         // worker: comissão liberada
    "dispute_opened",        // admin: nova disputa pra revisar
    "dispute_resolved",      // parties: admin resolveu/dismissou disputa
  ]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  linkPath: varchar("linkPath", { length: 200 }),
  relatedId: int("relatedId"),
  read: boolean("read").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Service history (denormalized for performance)
 */
export const serviceHistory = mysqlTable("service_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  serviceRequestId: int("serviceRequestId").notNull(),
  role: mysqlEnum("role", ["client", "worker"]).notNull(),
  statusAtTime: mysqlEnum("statusAtTime", ["requested", "accepted", "in_progress", "completed", "cancelled"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ServiceHistory = typeof serviceHistory.$inferSelect;
export type InsertServiceHistory = typeof serviceHistory.$inferInsert;

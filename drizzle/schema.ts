import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// =============================================================================
// Enums — Postgres exige cada enum como um tipo nomeado separado, então elas
// vivem no topo do arquivo e são referenciadas pelas colunas abaixo.
// =============================================================================

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "client",
  "worker",
  "admin",
]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "basic",
  "premium",
  "enterprise",
]);

export const timeSlotEnum = pgEnum("time_slot", [
  "morning",
  "afternoon",
  "evening",
  "night",
]);

export const urgencyLevelEnum = pgEnum("urgency_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const serviceStatusEnum = pgEnum("service_status", [
  "requested",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
]);

export const planChosenEnum = pgEnum("plan_chosen", [
  "basico",
  "pro",
  "premiere",
]);

export const referralStatusEnum = pgEnum("referral_status", [
  "pending",
  "active",
  "paid",
  "cancelled",
]);

export const disputeSeverityEnum = pgEnum("dispute_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "resolved",
  "dismissed",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "new_request_match",
  "request_accepted",
  "request_in_progress",
  "request_completed",
  "request_cancelled_by_client",
  "worker_dropped",
  "review_received",
  "referral_active",
  "referral_paid",
  "dispute_opened",
  "dispute_resolved",
]);

export const serviceHistoryRoleEnum = pgEnum("service_history_role", [
  "client",
  "worker",
]);

// =============================================================================
// Tables
// =============================================================================

/**
 * Core user table backing auth flow.
 * Extended with role field for client/worker distinction.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Specialties catalog
 */
export const specialties = pgTable("specialties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon_url: text("icon_url"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
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
export const workerProfiles = pgTable("worker_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  photoUrl: text("photoUrl"),
  bio: text("bio"),
  // Postgres jsonb is faster + indexed-friendly compared to plain json.
  specialties: jsonb("specialties").$type<number[]>().default([]),
  city: varchar("city", { length: 100 }),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  hourlyRate: numeric("hourlyRate", { precision: 10, scale: 2 }),
  rating: doublePrecision("rating").default(0),
  totalReviews: integer("totalReviews").default(0),
  isActive: boolean("isActive").default(true),
  acceptsFreela: boolean("acceptsFreela").default(true),
  acceptsDiaria: boolean("acceptsDiaria").default(true),
  acceptsFixa: boolean("acceptsFixa").default(false),
  professionArea: varchar("professionArea", { length: 200 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type WorkerProfile = typeof workerProfiles.$inferSelect;
export type InsertWorkerProfile = typeof workerProfiles.$inferInsert;

/**
 * Client profiles
 */
export const clientProfiles = pgTable("client_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  companyName: varchar("companyName", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  city: varchar("city", { length: 100 }),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  rating: doublePrecision("rating").default(0),
  totalReviews: integer("totalReviews").default(0),
  subscriptionPlan: subscriptionPlanEnum("subscriptionPlan").default("basic"),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type ClientProfile = typeof clientProfiles.$inferSelect;
export type InsertClientProfile = typeof clientProfiles.$inferInsert;

/**
 * Worker availability (dynamic)
 */
export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  workerId: integer("workerId").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  timeSlot: timeSlotEnum("timeSlot"),
  isAvailable: boolean("isAvailable").default(true),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = typeof availability.$inferInsert;

/**
 * Service requests
 */
export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull(),
  workerId: integer("workerId"),
  specialtyId: integer("specialtyId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  urgencyLevel: urgencyLevelEnum("urgencyLevel").default("medium"),
  status: serviceStatusEnum("status").default("requested"),
  scheduledDate: timestamp("scheduledDate", { withTimezone: true }),
  scheduledTime: varchar("scheduledTime", { length: 10 }),
  locationLatitude: doublePrecision("locationLatitude"),
  locationLongitude: doublePrecision("locationLongitude"),
  estimatedDurationMinutes: integer("estimatedDurationMinutes"),
  proposedPrice: numeric("proposedPrice", { precision: 10, scale: 2 }),
  finalPrice: numeric("finalPrice", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt", { withTimezone: true }),
  startedAt: timestamp("startedAt", { withTimezone: true }),
  completedAt: timestamp("completedAt", { withTimezone: true }),
});

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;

/**
 * Reviews and ratings
 */
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("serviceRequestId").notNull(),
  reviewerId: integer("reviewerId").notNull(),
  reviewedUserId: integer("reviewedUserId").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
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
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  // The trampista who brought in the deal (users.id).
  trampistaUserId: integer("trampistaUserId").notNull(),
  // Optional — set once the logista has a Trampei account.
  clientUserId: integer("clientUserId"),
  clientCompanyName: varchar("clientCompanyName", { length: 200 }).notNull(),
  clientContact: varchar("clientContact", { length: 200 }),
  planChosen: planChosenEnum("planChosen").default("basico"),
  firstPaymentAmount: numeric("firstPaymentAmount", { precision: 10, scale: 2 }),
  status: referralStatusEnum("status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  activatedAt: timestamp("activatedAt", { withTimezone: true }),
  paidAt: timestamp("paidAt", { withTimezone: true }),
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
export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("serviceRequestId").notNull(),
  openedByUserId: integer("openedByUserId").notNull(),
  reason: text("reason").notNull(),
  severity: disputeSeverityEnum("severity").default("medium"),
  status: disputeStatusEnum("status").default("open"),
  resolution: text("resolution"),
  resolvedByUserId: integer("resolvedByUserId"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt", { withTimezone: true }),
});

export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = typeof disputes.$inferInsert;

/**
 * In-app notifications — one row per delivered notice to a recipient user.
 * Emitted server-side from procedure handlers (accept, status change, review,
 * etc). The bell icon in AppLayout polls listMine + countUnread.
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  linkPath: varchar("linkPath", { length: 200 }),
  relatedId: integer("relatedId"),
  read: boolean("read").default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Service history (denormalized for performance)
 */
export const serviceHistory = pgTable("service_history", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  serviceRequestId: integer("serviceRequestId").notNull(),
  role: serviceHistoryRoleEnum("role").notNull(),
  statusAtTime: serviceStatusEnum("statusAtTime"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ServiceHistory = typeof serviceHistory.$inferSelect;
export type InsertServiceHistory = typeof serviceHistory.$inferInsert;

CREATE TYPE "public"."dispute_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('new_request_match', 'request_accepted', 'request_in_progress', 'request_completed', 'request_cancelled_by_client', 'worker_dropped', 'review_received', 'referral_active', 'referral_paid', 'dispute_opened', 'dispute_resolved');--> statement-breakpoint
CREATE TYPE "public"."plan_chosen" AS ENUM('basico', 'pro', 'premiere');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('pending', 'active', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."service_history_role" AS ENUM('client', 'worker');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('requested', 'accepted', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('basic', 'premium', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."time_slot" AS ENUM('morning', 'afternoon', 'evening', 'night');--> statement-breakpoint
CREATE TYPE "public"."urgency_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'client', 'worker', 'admin');--> statement-breakpoint
CREATE TABLE "availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"workerId" integer NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"timeSlot" time_slot,
	"isAvailable" boolean DEFAULT true,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"companyName" varchar(200) NOT NULL,
	"phone" varchar(20),
	"city" varchar(100),
	"latitude" double precision,
	"longitude" double precision,
	"rating" double precision DEFAULT 0,
	"totalReviews" integer DEFAULT 0,
	"subscriptionPlan" "subscription_plan" DEFAULT 'basic',
	"subscriptionExpiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_profiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"serviceRequestId" integer NOT NULL,
	"openedByUserId" integer NOT NULL,
	"reason" text NOT NULL,
	"severity" "dispute_severity" DEFAULT 'medium',
	"status" "dispute_status" DEFAULT 'open',
	"resolution" text,
	"resolvedByUserId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"resolvedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"linkPath" varchar(200),
	"relatedId" integer,
	"read" boolean DEFAULT false,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"trampistaUserId" integer NOT NULL,
	"clientUserId" integer,
	"clientCompanyName" varchar(200) NOT NULL,
	"clientContact" varchar(200),
	"planChosen" "plan_chosen" DEFAULT 'basico',
	"firstPaymentAmount" numeric(10, 2),
	"status" "referral_status" DEFAULT 'pending',
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"activatedAt" timestamp with time zone,
	"paidAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"serviceRequestId" integer NOT NULL,
	"reviewerId" integer NOT NULL,
	"reviewedUserId" integer NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"serviceRequestId" integer NOT NULL,
	"role" "service_history_role" NOT NULL,
	"statusAtTime" "service_status",
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"workerId" integer,
	"specialtyId" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"urgencyLevel" "urgency_level" DEFAULT 'medium',
	"status" "service_status" DEFAULT 'requested',
	"scheduledDate" timestamp with time zone,
	"scheduledTime" varchar(10),
	"locationLatitude" double precision,
	"locationLongitude" double precision,
	"estimatedDurationMinutes" integer,
	"proposedPrice" numeric(10, 2),
	"finalPrice" numeric(10, 2),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"acceptedAt" timestamp with time zone,
	"startedAt" timestamp with time zone,
	"completedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "specialties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon_url" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "specialties_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "worker_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"photoUrl" text,
	"bio" text,
	"specialties" jsonb DEFAULT '[]'::jsonb,
	"city" varchar(100),
	"latitude" double precision,
	"longitude" double precision,
	"hourlyRate" numeric(10, 2),
	"rating" double precision DEFAULT 0,
	"totalReviews" integer DEFAULT 0,
	"isActive" boolean DEFAULT true,
	"acceptsFreela" boolean DEFAULT true,
	"acceptsDiaria" boolean DEFAULT true,
	"acceptsFixa" boolean DEFAULT false,
	"professionArea" varchar(200),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "worker_profiles_userId_unique" UNIQUE("userId")
);

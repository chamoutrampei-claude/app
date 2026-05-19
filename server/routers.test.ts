import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { __resetInMemForTests, upsertClientProfile, upsertWorkerProfile } from "./db";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

// =============================================================================
// Test helpers
// =============================================================================

type Role = "user" | "worker" | "client" | "admin";

function mkUser(role: Role, overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: `test-${role}`,
    email: `test-${role}@trampei.local`,
    name: `Test ${role}`,
    loginMethod: "test",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function mkCtx(user: User | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function caller(role: Role, id = 1) {
  return appRouter.createCaller(mkCtx(mkUser(role, { id })));
}

beforeEach(() => {
  __resetInMemForTests();
});

// =============================================================================
// auth.setRole — onboarding
// =============================================================================

describe("auth.setRole", () => {
  it("transitions a fresh user to worker", async () => {
    const result = await caller("user", 100).auth.setRole({ role: "worker" });
    expect(result.role).toBe("worker");
    expect(result.id).toBe(100);
  });

  it("transitions a fresh user to client", async () => {
    const result = await caller("user", 101).auth.setRole({ role: "client" });
    expect(result.role).toBe("client");
  });

  it("refuses to change role if already set", async () => {
    await expect(caller("worker").auth.setRole({ role: "client" })).rejects.toThrow(
      /role already set/i,
    );
  });

  it("rejects unauthenticated requests", async () => {
    const anonCaller = appRouter.createCaller(mkCtx(null));
    await expect(anonCaller.auth.setRole({ role: "worker" })).rejects.toBeInstanceOf(
      TRPCError,
    );
  });
});

// =============================================================================
// worker.updateProfile — Disposição para Trabalho fields
// =============================================================================

describe("worker.updateProfile", () => {
  it("rejects when caller is not a worker", async () => {
    await expect(
      caller("client").worker.updateProfile({ bio: "x" }),
    ).rejects.toThrow(/only workers/i);
  });

  it("creates the profile on first save (upsert)", async () => {
    const result = await caller("worker", 200).worker.updateProfile({
      bio: "Pizzaiolo",
      city: "Taubaté",
      hourlyRate: "32.00",
      specialties: [5, 2],
    });
    expect(result?.userId).toBe(200);
    expect(result?.bio).toBe("Pizzaiolo");
    expect(result?.specialties).toEqual([5, 2]);
    // Defaults applied
    expect(result?.acceptsFreela).toBe(true);
    expect(result?.acceptsDiaria).toBe(true);
    expect(result?.acceptsFixa).toBe(false);
  });

  it("merges patches without clobbering untouched fields", async () => {
    const c = caller("worker", 201);
    await c.worker.updateProfile({ bio: "primeira", city: "Taubaté", hourlyRate: "30.00" });
    const after = await c.worker.updateProfile({ bio: "atualizada" });
    expect(after?.bio).toBe("atualizada");
    expect(after?.city).toBe("Taubaté");
    expect(after?.hourlyRate).toBe("30.00");
  });

  it("persists modalidade flags (acceptsFreela / Diaria / Fixa)", async () => {
    const result = await caller("worker", 202).worker.updateProfile({
      acceptsFreela: false,
      acceptsDiaria: false,
      acceptsFixa: true,
      professionArea: "Padaria",
    });
    expect(result?.acceptsFreela).toBe(false);
    expect(result?.acceptsDiaria).toBe(false);
    expect(result?.acceptsFixa).toBe(true);
    expect(result?.professionArea).toBe("Padaria");
  });
});

// =============================================================================
// worker.search — mode/specialty/city/rating filters
// =============================================================================

describe("worker.search", () => {
  async function seedTwoWorkers() {
    // Worker A: gig-only, Taubaté, specialty 1, rating 4.5
    await upsertWorkerProfile(300, {
      bio: "A",
      specialties: [1],
      city: "Taubaté",
      hourlyRate: "30.00",
      rating: 4.5,
      totalReviews: 10,
      acceptsFreela: true,
      acceptsDiaria: true,
      acceptsFixa: false,
    });
    // Worker B: fixa-only, Pinda, specialty 4, rating 5.0
    await upsertWorkerProfile(301, {
      bio: "B",
      specialties: [4],
      city: "Pindamonhangaba",
      rating: 5.0,
      totalReviews: 3,
      acceptsFreela: false,
      acceptsDiaria: false,
      acceptsFixa: true,
      professionArea: "Padaria",
    });
  }

  it("default mode=gig returns only gig-accepting workers", async () => {
    await seedTwoWorkers();
    const result = await caller("client").worker.search({});
    expect(result.map((w) => w.userId)).toEqual([300]);
  });

  it("mode=fixa returns only acceptsFixa workers", async () => {
    await seedTwoWorkers();
    const result = await caller("client").worker.search({ mode: "fixa" });
    expect(result.map((w) => w.userId)).toEqual([301]);
    expect(result[0].professionArea).toBe("Padaria");
  });

  it("mode=any ignores acceptance flags", async () => {
    await seedTwoWorkers();
    const result = await caller("client").worker.search({ mode: "any" });
    // Sorted by rating desc
    expect(result.map((w) => w.userId)).toEqual([301, 300]);
  });

  it("filters by specialty", async () => {
    await seedTwoWorkers();
    const result = await caller("client").worker.search({ mode: "any", specialtyId: 4 });
    expect(result.map((w) => w.userId)).toEqual([301]);
  });

  it("filters by city (case-insensitive partial match)", async () => {
    await seedTwoWorkers();
    const result = await caller("client").worker.search({ mode: "any", city: "pind" });
    expect(result.map((w) => w.userId)).toEqual([301]);
  });

  it("filters by minRating", async () => {
    await seedTwoWorkers();
    const result = await caller("client").worker.search({ mode: "any", minRating: 4.8 });
    expect(result.map((w) => w.userId)).toEqual([301]);
  });
});

// =============================================================================
// clientService.createRequest — service request creation
// =============================================================================

describe("clientService.createRequest", () => {
  it("rejects when caller is not a client", async () => {
    await expect(
      caller("worker").clientService.createRequest({
        specialtyId: 1,
        title: "x",
        description: "y",
        urgencyLevel: "medium",
      }),
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("rejects when client profile doesn't exist yet", async () => {
    await expect(
      caller("client", 400).clientService.createRequest({
        specialtyId: 1,
        title: "x",
        description: "y",
        urgencyLevel: "medium",
      }),
    ).rejects.toThrow(/Client profile not found/i);
  });

  it("persists a request and lists it back", async () => {
    const c = caller("client", 401);
    await c.clientService.updateProfile({ companyName: "Padaria Boa" });
    await c.clientService.createRequest({
      specialtyId: 1,
      title: "Auxiliar de cozinha",
      description: "Hoje 18h-23h",
      urgencyLevel: "high",
      proposedPrice: "120.00",
    });

    const list = await c.clientService.listRequests();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("Auxiliar de cozinha");
    expect(list[0].status).toBe("requested");
    expect(list[0].workerId).toBeNull();
  });
});

// =============================================================================
// worker.acceptRequest — claiming + duplicate detection
// =============================================================================

describe("worker.acceptRequest", () => {
  async function seedOpenRequest() {
    const cli = caller("client", 500);
    await cli.clientService.updateProfile({ companyName: "Empresa X" });
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "x",
      description: "y",
      urgencyLevel: "medium",
    });
  }

  it("worker with matching specialty claims open request", async () => {
    await seedOpenRequest();
    const wrk = caller("worker", 501);
    await wrk.worker.updateProfile({ specialties: [1] });
    const accepted = await wrk.worker.acceptRequest({ requestId: 1 });
    expect(accepted.status).toBe("accepted");
    expect(accepted.workerId).toBe(501);
    expect(accepted.acceptedAt).toBeInstanceOf(Date);
  });

  it("rejects with CONFLICT when request was already taken", async () => {
    await seedOpenRequest();
    const wrkA = caller("worker", 502);
    await wrkA.worker.updateProfile({ specialties: [1] });
    await wrkA.worker.acceptRequest({ requestId: 1 });
    // Second worker
    const wrkB = caller("worker", 503);
    await wrkB.worker.updateProfile({ specialties: [1] });
    await expect(wrkB.worker.acceptRequest({ requestId: 1 })).rejects.toThrow(
      /no longer available/i,
    );
  });
});

// =============================================================================
// review.createForRequest — counterparty derivation + duplicate guard
// =============================================================================

describe("review.createForRequest", () => {
  // Sets up a completed service request between client (600) and worker (601).
  async function seedCompletedRequest() {
    const cli = caller("client", 600);
    await cli.clientService.updateProfile({ companyName: "Pizzaria Z" });
    await cli.clientService.createRequest({
      specialtyId: 5,
      title: "Pizzaiolo",
      description: "Sábado",
      urgencyLevel: "high",
      proposedPrice: "200.00",
    });
    const wrk = caller("worker", 601);
    await wrk.worker.updateProfile({ specialties: [5] });
    await wrk.worker.acceptRequest({ requestId: 1 });
    await wrk.worker.updateStatus({ requestId: 1, status: "in_progress" });
    await wrk.worker.updateStatus({ requestId: 1, status: "completed" });
    return { cli, wrk };
  }

  it("refuses to review a request that isn't completed", async () => {
    const cli = caller("client", 700);
    await cli.clientService.updateProfile({ companyName: "Empresa X" });
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "t",
      description: "d",
      urgencyLevel: "low",
    });
    await expect(
      cli.review.createForRequest({ requestId: 1, rating: 5 }),
    ).rejects.toThrow(/concluídos/i);
  });

  it("client reviews worker — review is keyed to worker userId", async () => {
    const { cli } = await seedCompletedRequest();
    const review = await cli.review.createForRequest({
      requestId: 1,
      rating: 5,
      comment: "Top",
    });
    expect(review?.reviewerId).toBe(600);
    expect(review?.reviewedUserId).toBe(601);
    expect(review?.rating).toBe(5);
  });

  it("worker reviews client — review is keyed to client userId", async () => {
    const { wrk } = await seedCompletedRequest();
    const review = await wrk.review.createForRequest({
      requestId: 1,
      rating: 4,
    });
    expect(review?.reviewerId).toBe(601);
    expect(review?.reviewedUserId).toBe(600);
  });

  it("rejects a duplicate review from the same reviewer", async () => {
    const { cli } = await seedCompletedRequest();
    await cli.review.createForRequest({ requestId: 1, rating: 5 });
    await expect(
      cli.review.createForRequest({ requestId: 1, rating: 4 }),
    ).rejects.toThrow(/já avaliou/i);
  });

  it("updates the reviewed user's aggregated rating", async () => {
    const { cli, wrk } = await seedCompletedRequest();
    await cli.review.createForRequest({ requestId: 1, rating: 5 });
    const updatedWorker = await wrk.worker.getProfile();
    expect(updatedWorker?.rating).toBe(5);
    expect(updatedWorker?.totalReviews).toBe(1);
  });
});

// =============================================================================
// referral lifecycle — create, listMine, statsMine, advanceStatus
// =============================================================================

describe("referral", () => {
  it("create requires worker role", async () => {
    await expect(
      caller("client").referral.create({ clientCompanyName: "Empresa X" }),
    ).rejects.toThrow(/trampistas/i);
  });

  it("persists referral with default status=pending", async () => {
    const created = await caller("worker", 800).referral.create({
      clientCompanyName: "Padaria",
      planChosen: "pro",
      firstPaymentAmount: "147.00",
    });
    expect(created?.status).toBe("pending");
    expect(created?.trampistaUserId).toBe(800);
    expect(created?.firstPaymentAmount).toBe("147.00");
  });

  it("listMine returns only the caller's referrals", async () => {
    await caller("worker", 801).referral.create({ clientCompanyName: "Empresa A" });
    await caller("worker", 801).referral.create({ clientCompanyName: "Empresa B" });
    await caller("worker", 802).referral.create({ clientCompanyName: "Empresa C" });

    const list801 = await caller("worker", 801).referral.listMine();
    expect(list801).toHaveLength(2);
    expect(list801.map((r) => r.clientCompanyName).sort()).toEqual([
      "Empresa A",
      "Empresa B",
    ]);
  });

  it("statsMine aggregates by status and sums paid", async () => {
    const c = caller("worker", 803);
    await c.referral.create({ clientCompanyName: "Empresa 1", firstPaymentAmount: "100.00" });
    await c.referral.create({ clientCompanyName: "Empresa 2", firstPaymentAmount: "200.00" });
    await c.referral.advanceStatus({ referralId: 1, newStatus: "active" });
    await c.referral.advanceStatus({ referralId: 1, newStatus: "paid" });

    const stats = await c.referral.statsMine();
    expect(stats.total).toBe(2);
    expect(stats.byStatus.paid).toBe(1);
    expect(stats.byStatus.pending).toBe(1);
    expect(stats.totalEarned).toBe(100);
  });

  it("advanceStatus owner: pending → active sets activatedAt", async () => {
    const c = caller("worker", 804);
    await c.referral.create({ clientCompanyName: "Empresa X" });
    const result = await c.referral.advanceStatus({ referralId: 1, newStatus: "active" });
    expect(result.status).toBe("active");
    expect(result.activatedAt).toBeInstanceOf(Date);
    expect(result.paidAt).toBeNull();
  });

  it("advanceStatus owner: active → paid sets paidAt", async () => {
    const c = caller("worker", 805);
    await c.referral.create({ clientCompanyName: "Empresa X" });
    await c.referral.advanceStatus({ referralId: 1, newStatus: "active" });
    const result = await c.referral.advanceStatus({ referralId: 1, newStatus: "paid" });
    expect(result.status).toBe("paid");
    expect(result.paidAt).toBeInstanceOf(Date);
  });

  it("advanceStatus admin can act on any referral", async () => {
    await caller("worker", 806).referral.create({ clientCompanyName: "Empresa X" });
    const result = await caller("admin", 999).referral.advanceStatus({
      referralId: 1,
      newStatus: "active",
    });
    expect(result.status).toBe("active");
  });

  it("advanceStatus by non-owner non-admin is FORBIDDEN", async () => {
    await caller("worker", 807).referral.create({ clientCompanyName: "Empresa X" });
    // A different worker tries to advance
    await expect(
      caller("worker", 808).referral.advanceStatus({
        referralId: 1,
        newStatus: "active",
      }),
    ).rejects.toThrow(/permissão/i);
  });
});

// =============================================================================
// admin router — global view + guards
// =============================================================================

describe("admin", () => {
  it("listReferrals requires admin role", async () => {
    await expect(caller("worker").admin.listReferrals()).rejects.toBeInstanceOf(
      TRPCError,
    );
    await expect(caller("client").admin.listReferrals()).rejects.toBeInstanceOf(
      TRPCError,
    );
  });

  it("listReferrals returns all referrals across trampistas", async () => {
    await caller("worker", 900).referral.create({ clientCompanyName: "X1" });
    await caller("worker", 901).referral.create({ clientCompanyName: "Y1" });
    const all = await caller("admin", 999).admin.listReferrals();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.clientCompanyName).sort()).toEqual(["X1", "Y1"]);
  });

  it("listReferrals filters by status", async () => {
    const w = caller("worker", 902);
    await w.referral.create({ clientCompanyName: "Empresa X" });
    await w.referral.create({ clientCompanyName: "Empresa Y" });
    await w.referral.advanceStatus({ referralId: 1, newStatus: "active" });

    const admin = caller("admin", 999);
    const pending = await admin.admin.listReferrals({ status: "pending" });
    expect(pending).toHaveLength(1);
    expect(pending[0].clientCompanyName).toBe("Empresa Y");

    const active = await admin.admin.listReferrals({ status: "active" });
    expect(active).toHaveLength(1);
    expect(active[0].clientCompanyName).toBe("Empresa X");
  });

  it("referralStats computes platform-wide totals", async () => {
    const w1 = caller("worker", 903);
    const w2 = caller("worker", 904);
    await w1.referral.create({ clientCompanyName: "Empresa A", firstPaymentAmount: "100.00" });
    await w1.referral.create({ clientCompanyName: "Empresa B", firstPaymentAmount: "200.00" });
    await w2.referral.create({ clientCompanyName: "Empresa C", firstPaymentAmount: "300.00" });
    await w1.referral.advanceStatus({ referralId: 1, newStatus: "active" });
    await w1.referral.advanceStatus({ referralId: 1, newStatus: "paid" });

    const stats = await caller("admin", 999).admin.referralStats();
    expect(stats.total).toBe(3);
    expect(stats.byStatus.paid).toBe(1);
    expect(stats.byStatus.pending).toBe(2);
    expect(stats.totalCommissionsPaid).toBe(100);
    expect(stats.totalPipelineValue).toBe(500); // 200 + 300 still pending
    expect(stats.uniqueTrampistas).toBe(2);
  });
});

// =============================================================================
// clientService.updateProfile — companyName required on first save
// =============================================================================

describe("clientService.updateProfile", () => {
  it("refuses to create without companyName", async () => {
    await expect(
      caller("client", 950).clientService.updateProfile({ city: "Taubaté" }),
    ).rejects.toThrow(/obrigatório/i);
  });

  it("creates client profile with companyName", async () => {
    const result = await caller("client", 951).clientService.updateProfile({
      companyName: "Padaria Pão Quente",
      city: "Taubaté",
    });
    expect(result?.companyName).toBe("Padaria Pão Quente");
    expect(result?.userId).toBe(951);
  });

  it("subsequent updates may omit companyName", async () => {
    const c = caller("client", 952);
    await c.clientService.updateProfile({ companyName: "Empresa X" });
    const after = await c.clientService.updateProfile({ phone: "(12) 99999-9999" });
    expect(after?.companyName).toBe("Empresa X");
    expect(after?.phone).toBe("(12) 99999-9999");
  });
});

// =============================================================================
// cancelRequest — client + worker
// =============================================================================

describe("cancelRequest", () => {
  async function seedOpenRequest(clientId: number) {
    const cli = caller("client", clientId);
    await cli.clientService.updateProfile({ companyName: "Pizzaria Z" });
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "Aux",
      description: "Hoje",
      urgencyLevel: "medium",
    });
    return cli;
  }

  it("client cancela request requested → cancelled", async () => {
    const cli = await seedOpenRequest(1000);
    const result = await cli.clientService.cancelRequest({ requestId: 1 });
    expect(result?.status).toBe("cancelled");
  });

  it("client não consegue cancelar request já completed", async () => {
    const cli = await seedOpenRequest(1001);
    const wrk = caller("worker", 1002);
    await wrk.worker.updateProfile({ specialties: [1] });
    await wrk.worker.acceptRequest({ requestId: 1 });
    await wrk.worker.updateStatus({ requestId: 1, status: "in_progress" });
    await wrk.worker.updateStatus({ requestId: 1, status: "completed" });
    await expect(
      cli.clientService.cancelRequest({ requestId: 1 }),
    ).rejects.toThrow(/encerrada/i);
  });

  it("worker desiste de trampo aceito → status volta pra requested, workerId zera", async () => {
    const cli = await seedOpenRequest(1003);
    const wrk = caller("worker", 1004);
    await wrk.worker.updateProfile({ specialties: [1] });
    await wrk.worker.acceptRequest({ requestId: 1 });
    const result = await wrk.worker.cancelAcceptedRequest({ requestId: 1 });
    expect(result?.status).toBe("requested");
    expect(result?.workerId).toBeNull();
    expect(result?.acceptedAt).toBeNull();
  });

  it("worker não pode cancelar trampo de outro worker", async () => {
    const cli = await seedOpenRequest(1005);
    const wrkA = caller("worker", 1006);
    await wrkA.worker.updateProfile({ specialties: [1] });
    await wrkA.worker.acceptRequest({ requestId: 1 });
    const wrkB = caller("worker", 1007);
    await wrkB.worker.updateProfile({ specialties: [1] });
    await expect(
      wrkB.worker.cancelAcceptedRequest({ requestId: 1 }),
    ).rejects.toBeInstanceOf(TRPCError);
  });
});

// =============================================================================
// availability — worker.setAvailability + listAvailability
// =============================================================================

describe("worker availability", () => {
  it("rejects when caller is not a worker", async () => {
    await expect(
      caller("client").worker.setAvailability({
        date: "2026-06-01",
        timeSlot: "morning",
        isAvailable: true,
      }),
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("rejects when worker profile doesn't exist yet", async () => {
    await expect(
      caller("worker", 1100).worker.setAvailability({
        date: "2026-06-01",
        timeSlot: "morning",
        isAvailable: true,
      }),
    ).rejects.toThrow(/perfil/i);
  });

  it("set then list returns the slots", async () => {
    const c = caller("worker", 1101);
    await c.worker.updateProfile({ specialties: [1] });
    await c.worker.setAvailability({
      date: "2026-06-01",
      timeSlot: "morning",
      isAvailable: true,
    });
    await c.worker.setAvailability({
      date: "2026-06-02",
      timeSlot: "evening",
      isAvailable: true,
    });
    const list = await c.worker.listAvailability({});
    expect(list.length).toBe(2);
    expect(list.map((s) => s.timeSlot).sort()).toEqual(["evening", "morning"]);
  });

  it("upsert: re-setting same slot updates rather than duplicates", async () => {
    const c = caller("worker", 1102);
    await c.worker.updateProfile({ specialties: [1] });
    await c.worker.setAvailability({
      date: "2026-06-01",
      timeSlot: "morning",
      isAvailable: true,
    });
    await c.worker.setAvailability({
      date: "2026-06-01",
      timeSlot: "morning",
      isAvailable: false,
    });
    const list = await c.worker.listAvailability({});
    expect(list.length).toBe(1);
    expect(list[0].isAvailable).toBe(false);
  });
});

// =============================================================================
// notifications — listMine + countUnread + markRead + markAllRead
// =============================================================================

describe("notification", () => {
  it("countUnread reflects fanout from createRequest", async () => {
    // Worker with specialty 1
    const wrk = caller("worker", 1200);
    await wrk.worker.updateProfile({ specialties: [1] });
    expect(await wrk.notification.countUnread()).toBe(0);
    // Client publishes a matching request → fan-out
    const cli = caller("client", 1201);
    await cli.clientService.updateProfile({ companyName: "ABC" });
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "x",
      description: "y",
      urgencyLevel: "medium",
    });
    expect(await wrk.notification.countUnread()).toBe(1);
  });

  it("markRead drops the count", async () => {
    const wrk = caller("worker", 1202);
    await wrk.worker.updateProfile({ specialties: [1] });
    const cli = caller("client", 1203);
    await cli.clientService.updateProfile({ companyName: "ABC" });
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "x",
      description: "y",
      urgencyLevel: "medium",
    });
    const list = await wrk.notification.listMine();
    expect(list.length).toBe(1);
    await wrk.notification.markRead({ notificationId: list[0].id });
    expect(await wrk.notification.countUnread()).toBe(0);
  });

  it("markAllRead zeroes everything for the caller", async () => {
    const wrk = caller("worker", 1204);
    await wrk.worker.updateProfile({ specialties: [1] });
    const cli = caller("client", 1205);
    await cli.clientService.updateProfile({ companyName: "ABC" });
    // Two requests → two notifications
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "a",
      description: "b",
      urgencyLevel: "low",
    });
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "c",
      description: "d",
      urgencyLevel: "high",
    });
    expect(await wrk.notification.countUnread()).toBe(2);
    await wrk.notification.markAllRead();
    expect(await wrk.notification.countUnread()).toBe(0);
  });
});

// =============================================================================
// dispute — create + admin resolveDispute + listMine
// =============================================================================

describe("dispute", () => {
  async function seedAssignedRequest(clientId: number, workerId: number) {
    const cli = caller("client", clientId);
    await cli.clientService.updateProfile({ companyName: "X Eireli" });
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "Trampo X",
      description: "Detalhes",
      urgencyLevel: "medium",
    });
    const wrk = caller("worker", workerId);
    await wrk.worker.updateProfile({ specialties: [1] });
    await wrk.worker.acceptRequest({ requestId: 1 });
    return { cli, wrk };
  }

  it("non-party rejected with FORBIDDEN", async () => {
    await seedAssignedRequest(1300, 1301);
    // Random user not on this request
    await expect(
      caller("client", 1399).dispute.create({
        serviceRequestId: 1,
        reason: "Quero meter o bedelho onde não fui chamado.",
      }),
    ).rejects.toThrow(/envolvido|FORBIDDEN/i);
  });

  it("client party can open dispute → admin sees in listDisputes", async () => {
    const { cli } = await seedAssignedRequest(1302, 1303);
    await cli.dispute.create({
      serviceRequestId: 1,
      reason: "Trampista não apareceu no horário combinado.",
      severity: "high",
    });
    const list = await caller("admin", 9999).admin.listDisputes();
    expect(list.length).toBe(1);
    expect(list[0].severity).toBe("high");
    expect(list[0].status).toBe("open");
  });

  it("dispute.listMine retorna só do caller", async () => {
    const { cli, wrk } = await seedAssignedRequest(1304, 1305);
    await cli.dispute.create({
      serviceRequestId: 1,
      reason: "Reclamação do cliente sobre demora.",
    });
    const mine = await cli.dispute.listMine();
    const notMine = await wrk.dispute.listMine();
    expect(mine.length).toBe(1);
    expect(notMine.length).toBe(0);
  });

  it("admin resolves dispute, status muda + notifica partes", async () => {
    const { cli } = await seedAssignedRequest(1306, 1307);
    await cli.dispute.create({
      serviceRequestId: 1,
      reason: "Problema sério com o trampo entregue.",
      severity: "critical",
    });
    const admin = caller("admin", 9999);
    const result = await admin.admin.resolveDispute({
      disputeId: 1,
      newStatus: "resolved",
      resolution: "Reembolso aprovado pelo time TRAMPEI.",
    });
    expect(result?.status).toBe("resolved");
    expect(result?.resolvedAt).toBeTruthy();
    // Cliente recebe notificação dispute_resolved
    const clientNotifs = await cli.notification.listMine();
    expect(
      clientNotifs.some((n) => n.type === "dispute_resolved"),
    ).toBe(true);
  });

  it("admin não pode resolver disputa já resolvida", async () => {
    const { cli } = await seedAssignedRequest(1308, 1309);
    await cli.dispute.create({
      serviceRequestId: 1,
      reason: "Texto longo o suficiente.",
    });
    const admin = caller("admin", 9999);
    await admin.admin.resolveDispute({
      disputeId: 1,
      newStatus: "resolved",
      resolution: "Ok pelo time.",
    });
    await expect(
      admin.admin.resolveDispute({
        disputeId: 1,
        newStatus: "dismissed",
        resolution: "Tentando de novo.",
      }),
    ).rejects.toThrow(/resolvida|descartada/i);
  });
});

// =============================================================================
// worker.publicProfile — currículo público
// =============================================================================

describe("worker.publicProfile", () => {
  it("returns sanitized profile + completedJobs", async () => {
    // Worker preenche perfil
    const wrk = caller("worker", 1400);
    await wrk.worker.updateProfile({
      bio: "Pizzaiolo experiente",
      city: "Taubaté",
      specialties: [5],
      hourlyRate: "30.00",
    });
    // Sem auth: chama o procedure público
    const anon = appRouter.createCaller(mkCtx(null));
    const profile = await anon.worker.publicProfile({ userId: 1400 });
    expect(profile?.userId).toBe(1400);
    expect(profile?.bio).toBe("Pizzaiolo experiente");
    expect(profile?.completedJobs).toBe(0);
    expect(profile?.memberSince).toBeTruthy();
  });

  it("completedJobs sobe quando o worker fecha um trampo", async () => {
    const wrk = caller("worker", 1401);
    await wrk.worker.updateProfile({ specialties: [1] });
    const cli = caller("client", 1402);
    await cli.clientService.updateProfile({ companyName: "Padaria" });
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "x",
      description: "y",
      urgencyLevel: "low",
    });
    await wrk.worker.acceptRequest({ requestId: 1 });
    await wrk.worker.updateStatus({ requestId: 1, status: "completed" });
    const anon = appRouter.createCaller(mkCtx(null));
    const profile = await anon.worker.publicProfile({ userId: 1401 });
    expect(profile?.completedJobs).toBe(1);
  });

  it("returns undefined for non-existent worker", async () => {
    const anon = appRouter.createCaller(mkCtx(null));
    const profile = await anon.worker.publicProfile({ userId: 99999 });
    expect(profile).toBeUndefined();
  });
});

// =============================================================================
// auth.exportMyData — LGPD bundle
// =============================================================================

describe("auth.exportMyData", () => {
  it("returns the caller's full bundle", async () => {
    const wrk = caller("worker", 1500);
    await wrk.worker.updateProfile({ bio: "Bio teste", specialties: [1] });
    const cli = caller("client", 1501);
    await cli.clientService.updateProfile({ companyName: "Padaria 1500" });
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "Trampo teste",
      description: "Detalhes",
      urgencyLevel: "medium",
    });
    await wrk.referral.create({ clientCompanyName: "Hambúrgueria xyz" });

    const data = await wrk.auth.exportMyData();
    expect(data.user.id).toBe(1500);
    expect(data.workerProfile?.bio).toBe("Bio teste");
    expect(data.referrals.length).toBe(1);
    expect(data.workerRequests.length).toBeGreaterThanOrEqual(0);
    expect(data.exportedAt).toBeInstanceOf(Date);
  });
});

// =============================================================================
// listServiceRequestsForClient — enriched with worker name + userId
// =============================================================================

describe("clientService.listRequests (enriched)", () => {
  it("workerName/workerUserId null when nobody accepted", async () => {
    const cli = caller("client", 1600);
    await cli.clientService.updateProfile({ companyName: "Padaria" });
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "x",
      description: "y",
      urgencyLevel: "low",
    });
    const list = await cli.clientService.listRequests();
    expect(list[0].workerUserId).toBeNull();
    expect(list[0].workerName).toBeNull();
  });

  it("workerName/workerUserId populated after worker accepts", async () => {
    const cli = caller("client", 1601);
    await cli.clientService.updateProfile({ companyName: "Padaria" });
    await cli.clientService.createRequest({
      specialtyId: 1,
      title: "x",
      description: "y",
      urgencyLevel: "low",
    });
    const wrk = caller("worker", 1602);
    await wrk.worker.updateProfile({ specialties: [1] });
    await wrk.worker.acceptRequest({ requestId: 1 });
    const list = await cli.clientService.listRequests();
    expect(list[0].workerUserId).toBe(1602);
  });
});

import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { rateLimitMiddleware } from "./_core/rateLimit";
import { storageGetPresignedPutUrl } from "./storage";
import { z } from "zod";
import {
  getWorkerProfile,
  updateWorkerProfile,
  getClientProfile,
  updateClientProfile,
  listSpecialties,
  createServiceRequest,
  getServiceRequest,
  updateServiceRequest,
  listServiceRequestsForWorker,
  listServiceRequestsForClient,
  acceptServiceRequest,
  searchWorkers,
  getPublicWorkerProfile,
  listAvailabilityForWorker,
  setAvailability,
  createNotification,
  listNotificationsForUser,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  findWorkerUserIdsForSpecialty,
  getClientProfileUserId,
  getWorkerProfileUserId,
  createReferral,
  listReferralsByTrampista,
  getReferralStats,
  updateReferralStatus,
  getReferral,
  listAllReferrals,
  getGlobalReferralStats,
  createDispute,
  listDisputesByUser,
  listAllDisputes,
  getDispute,
  resolveDispute,
  createReview,
  getReviewsForUser,
  getReviewsForRequest,
  getReviewsByReviewer,
  recomputeUserRating,
  getCounterpartyUserId,
  setUserRole,
} from "./db";
import { TRPCError } from "@trpc/server";

// Limits a rate-controlled mutation. Bucket per user (or IP) per scope.
// Limits chosen empiricamente — apertar depois conforme telemetria.
const rateLimited = (config: {
  scope: string;
  max: number;
  windowSec: number;
}) => protectedProcedure.use(rateLimitMiddleware(config));

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    // LGPD: usuário exporta todos os dados pessoais armazenados sobre ele.
    // Retorna JSON pronto pra download. Cobre: identidade, perfis worker/client,
    // solicitações criadas/aceitas, reviews (autoria + recebidas), referrals
    // como trampista, disputas, notificações. Pode ser pesado em conta antiga.
    exportMyData: protectedProcedure.query(async ({ ctx }) => {
      const uid = ctx.user.id;
      const workerProfile = await getWorkerProfile(uid);
      const clientProfile = await getClientProfile(uid);
      const clientRequests = clientProfile
        ? await listServiceRequestsForClient(clientProfile.id)
        : [];
      const workerRequests = await listServiceRequestsForWorker(uid);
      const reviewsAuthored = await getReviewsByReviewer(uid);
      const reviewsReceived = await getReviewsForUser(uid);
      const referrals = await listReferralsByTrampista(uid);
      const disputesOpened = await listDisputesByUser(uid);
      const notifications = await listNotificationsForUser(uid, { limit: 9999 });

      return {
        exportedAt: new Date(),
        user: {
          id: ctx.user.id,
          openId: ctx.user.openId,
          name: ctx.user.name,
          email: ctx.user.email,
          role: ctx.user.role,
          createdAt: ctx.user.createdAt,
          lastSignedIn: ctx.user.lastSignedIn,
        },
        workerProfile,
        clientProfile,
        clientRequests,
        workerRequests,
        reviewsAuthored,
        reviewsReceived,
        referrals,
        disputesOpened,
        notifications,
      };
    }),

    // One-time onboarding choice. After it succeeds the caller should refetch
    // auth.me so the new role propagates into the client.
    setRole: protectedProcedure
      .input(z.object({ role: z.enum(["worker", "client"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "user") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Role already set" });
        }
        const updated = await setUserRole(ctx.user.id, input.role);
        if (!updated) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to set role" });
        }
        return updated;
      }),
  }),

  // Worker profile procedures
  worker: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return getWorkerProfile(ctx.user.id);
    }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          photoUrl: z.string().optional(),
          bio: z.string().optional(),
          specialties: z.array(z.number()).optional(),
          city: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          hourlyRate: z.string().optional(),
          isActive: z.boolean().optional(),
          // Modalidades de trabalho que o trampista aceita.
          acceptsFreela: z.boolean().optional(),
          acceptsDiaria: z.boolean().optional(),
          acceptsFixa: z.boolean().optional(),
          // Área profissional (texto livre) usada na busca de vaga fixa.
          professionArea: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "worker") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only workers can update worker profile" });
        }
        return updateWorkerProfile(ctx.user.id, input);
      }),

    listRequests: protectedProcedure.query(async ({ ctx }) => {
      return listServiceRequestsForWorker(ctx.user.id);
    }),

    acceptRequest: rateLimited({ scope: "acceptRequest", max: 60, windowSec: 60 })
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "worker") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const workerProfile = await getWorkerProfile(ctx.user.id);
        if (!workerProfile) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Worker profile not found" });
        }
        const accepted = await acceptServiceRequest(workerProfile.id, input.requestId);
        if (!accepted) {
          throw new TRPCError({ code: "CONFLICT", message: "Request is no longer available" });
        }
        // Notifica o cliente que alguém aceitou.
        const clientUserId = await getClientProfileUserId(accepted.clientId);
        if (clientUserId) {
          await createNotification({
            userId: clientUserId,
            type: "request_accepted",
            title: "Sua solicitação foi aceita!",
            body: `${ctx.user.name ?? "Um trampista"} aceitou: ${accepted.title}`,
            linkPath: "/client",
            relatedId: accepted.id,
          });
        }
        return accepted;
      }),

    rejectRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "worker") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        // Per-worker rejection isn't persisted: the schema has no rejections
        // table and the request status enum has no "rejected" state. The
        // frontend dismisses the card from this worker's dashboard locally,
        // leaving the request open for other workers to accept.
        return { success: true } as const;
      }),

    // Browse worker profiles with optional filters. Public to authenticated
    // users (so clients can discover trampistas) — does not leak contact info.
    // `mode` switches between the gig-marketplace tab (freela/diária) and the
    // "Disposição para Trabalho" CV tab (fixa).
    // Página pública compartilhável do trampista — não exige login.
    // Sanitiza: sem email, sem coords exatas, só cidade. Reviews anônimos.
    publicProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getPublicWorkerProfile(input.userId);
      }),

    search: protectedProcedure
      .input(
        z.object({
          specialtyId: z.number().optional(),
          city: z.string().optional(),
          minRating: z.number().min(0).max(5).optional(),
          mode: z.enum(["gig", "fixa", "any"]).optional(),
          // Cliente passa a própria lat/lng pra rankear por proximidade.
          fromLat: z.number().optional(),
          fromLng: z.number().optional(),
          maxKm: z.number().positive().optional(),
        }),
      )
      .query(async ({ input }) => {
        return searchWorkers(input);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          status: z.enum(["in_progress", "completed"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "worker") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const workerProfile = await getWorkerProfile(ctx.user.id);
        if (!workerProfile) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const request = await getServiceRequest(input.requestId);
        if (!request || request.workerId !== workerProfile.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const patch: Partial<{ status: typeof input.status; startedAt: Date; completedAt: Date }> = {
          status: input.status,
        };
        if (input.status === "in_progress" && !request.startedAt) {
          patch.startedAt = new Date();
        }
        if (input.status === "completed" && !request.completedAt) {
          patch.completedAt = new Date();
        }
        const updated = await updateServiceRequest(input.requestId, patch);
        // Notifica o cliente da mudança de status.
        const clientUserId = await getClientProfileUserId(request.clientId);
        if (clientUserId) {
          await createNotification({
            userId: clientUserId,
            type: input.status === "in_progress" ? "request_in_progress" : "request_completed",
            title:
              input.status === "in_progress"
                ? "Trampo começou"
                : "Trampo concluído",
            body: request.title,
            linkPath: "/client",
            relatedId: request.id,
          });
        }
        return updated;
      }),

    // Disponibilidade semanal — worker carve next-N-days em slots
    // (manhã/tarde/noite/madrugada). Cliente vê quando o trampista está livre.
    listAvailability: protectedProcedure
      .input(
        z.object({
          // Padrão: próximos 14 dias contados de hoje.
          fromDate: z.string().optional(),
          toDate: z.string().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "worker") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const profile = await getWorkerProfile(ctx.user.id);
        if (!profile) return [];
        const from = input.fromDate ? new Date(input.fromDate) : new Date();
        const to = input.toDate
          ? new Date(input.toDate)
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        return listAvailabilityForWorker(profile.id, from, to);
      }),

    setAvailability: protectedProcedure
      .input(
        z.object({
          date: z.string(), // ISO YYYY-MM-DD
          timeSlot: z.enum(["morning", "afternoon", "evening", "night"]),
          isAvailable: z.boolean(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "worker") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const profile = await getWorkerProfile(ctx.user.id);
        if (!profile) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Crie seu perfil antes de marcar disponibilidade.",
          });
        }
        return setAvailability(
          profile.id,
          new Date(input.date),
          input.timeSlot,
          input.isAvailable,
        );
      }),

    // Worker abandona um trampo que ele já tinha aceitado mas ainda não
    // concluiu. Volta o status pra `requested` e zera o workerId pra outros
    // trampistas poderem aceitar.
    cancelAcceptedRequest: protectedProcedure
      .input(z.object({ requestId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "worker") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const workerProfile = await getWorkerProfile(ctx.user.id);
        if (!workerProfile) throw new TRPCError({ code: "FORBIDDEN" });
        const request = await getServiceRequest(input.requestId);
        if (!request || request.workerId !== workerProfile.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (request.status === "completed" || request.status === "cancelled") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Trampo já encerrado, não dá pra cancelar.",
          });
        }
        const updated = await updateServiceRequest(input.requestId, {
          workerId: null,
          status: "requested",
          acceptedAt: null,
          startedAt: null,
        });
        // Notifica o cliente que o trampista desistiu.
        const clientUserId = await getClientProfileUserId(request.clientId);
        if (clientUserId) {
          await createNotification({
            userId: clientUserId,
            type: "worker_dropped",
            title: "Trampista desistiu",
            body: `Sua solicitação "${request.title}" voltou pra fila — outros trampistas podem aceitar.`,
            linkPath: "/client",
            relatedId: request.id,
          });
        }
        return updated;
      }),
  }),

  // Client profile procedures
  clientService: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return getClientProfile(ctx.user.id);
    }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          companyName: z.string().min(2).optional(),
          phone: z.string().optional(),
          city: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "client") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only clients can update client profile" });
        }
        try {
          return await updateClientProfile(ctx.user.id, input);
        } catch (error) {
          if (error instanceof Error && error.message.includes("companyName is required")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Nome da empresa é obrigatório no primeiro cadastro.",
            });
          }
          throw error;
        }
      }),

    createRequest: rateLimited({ scope: "createRequest", max: 20, windowSec: 3600 })
      .input(
        z.object({
          specialtyId: z.number(),
          title: z.string(),
          description: z.string(),
          urgencyLevel: z.enum(["low", "medium", "high", "critical"]),
          scheduledDate: z.string().optional(),
          scheduledTime: z.string().optional(),
          locationLatitude: z.number().optional(),
          locationLongitude: z.number().optional(),
          estimatedDurationMinutes: z.number().optional(),
          proposedPrice: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "client") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const clientProfile = await getClientProfile(ctx.user.id);
        if (!clientProfile) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Client profile not found" });
        }
        const created = await createServiceRequest({
          clientId: clientProfile.id,
          specialtyId: input.specialtyId,
          title: input.title,
          description: input.description,
          urgencyLevel: input.urgencyLevel,
          scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
          scheduledTime: input.scheduledTime,
          locationLatitude: input.locationLatitude,
          locationLongitude: input.locationLongitude,
          estimatedDurationMinutes: input.estimatedDurationMinutes,
          proposedPrice: input.proposedPrice,
        });
        // Fan-out: notifica todos os trampistas com specialty compatível.
        const workerUserIds = await findWorkerUserIdsForSpecialty(input.specialtyId);
        const relatedId =
          created && typeof created === "object" && "id" in created
            ? (created.id as number)
            : null;
        await Promise.all(
          workerUserIds.map((uid) =>
            createNotification({
              userId: uid,
              type: "new_request_match",
              title: "Nova solicitação na sua especialidade",
              body: `${input.title} — urgência ${input.urgencyLevel}`,
              linkPath: "/worker",
              relatedId,
            }),
          ),
        );
        return created;
      }),

    listRequests: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "client") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const clientProfile = await getClientProfile(ctx.user.id);
      if (!clientProfile) return [];
      return listServiceRequestsForClient(clientProfile.id);
    }),

    // Cliente cancela uma solicitação que ele mesmo criou. Permitido em
    // qualquer status menos `completed` (já fechou) ou `cancelled` (já tava).
    cancelRequest: protectedProcedure
      .input(z.object({ requestId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "client") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const clientProfile = await getClientProfile(ctx.user.id);
        if (!clientProfile) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Client profile not found" });
        }
        const request = await getServiceRequest(input.requestId);
        if (!request || request.clientId !== clientProfile.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (request.status === "completed" || request.status === "cancelled") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Solicitação já encerrada, não dá pra cancelar.",
          });
        }
        const updated = await updateServiceRequest(input.requestId, { status: "cancelled" });
        // Notifica o worker se tinha um aceito.
        if (request.workerId) {
          const workerUserId = await getWorkerProfileUserId(request.workerId);
          if (workerUserId) {
            await createNotification({
              userId: workerUserId,
              type: "request_cancelled_by_client",
              title: "Cliente cancelou o trampo",
              body: request.title,
              linkPath: "/worker",
              relatedId: request.id,
            });
          }
        }
        return updated;
      }),
  }),

  // Dispute procedures — abrir / listar / resolver disputas sobre solicitações.
  dispute: router({
    create: rateLimited({ scope: "createDispute", max: 5, windowSec: 86400 })
      .input(
        z.object({
          serviceRequestId: z.number(),
          reason: z.string().min(10, "Conta pelo menos 10 caracteres do que aconteceu."),
          severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Quem pode abrir: o cliente dono da solicitação OU o worker assigned.
        const request = await getServiceRequest(input.serviceRequestId);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada." });
        }
        const clientUserId = await getClientProfileUserId(request.clientId);
        const workerUserId = request.workerId
          ? await getWorkerProfileUserId(request.workerId)
          : undefined;
        const isParty = ctx.user.id === clientUserId || ctx.user.id === workerUserId;
        if (!isParty && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não está envolvido nessa solicitação.",
          });
        }
        const created = await createDispute({
          serviceRequestId: input.serviceRequestId,
          openedByUserId: ctx.user.id,
          reason: input.reason.trim(),
          severity: input.severity ?? "medium",
        });
        // Notifica admins (mock 9004 em dev). Em produção, fan-out pra todos
        // os usuários com role=admin via uma listAdminUserIds() — pra MVP, só
        // o admin dev.
        await createNotification({
          userId: 9004,
          type: "dispute_opened",
          title: `Nova disputa (${input.severity ?? "medium"})`,
          body: `${ctx.user.name ?? "Usuário"} reportou problema em "${request.title}"`,
          linkPath: "/admin/disputes",
          relatedId: created?.id ?? null,
        });
        return created;
      }),

    listMine: protectedProcedure.query(async ({ ctx }) => {
      return listDisputesByUser(ctx.user.id);
    }),
  }),

  // Upload procedures — pede presigned PUT URL pro client subir foto direto pro S3.
  upload: router({
    requestPhotoUpload: protectedProcedure
      .input(
        z.object({
          // Extensão pra apêndice. Servidor anexa hash random pra evitar colisão.
          filename: z.string().min(1).max(200),
          contentType: z
            .string()
            .regex(/^image\/(jpeg|jpg|png|webp)$/i, "Apenas JPEG, PNG ou WebP."),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const ext = input.filename.split(".").pop() || "jpg";
          const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
          const relKey = `user-photos/${ctx.user.id}.${safeExt}`;
          const { uploadUrl, publicPath } = await storageGetPresignedPutUrl(relKey);
          return { uploadUrl, publicPath, contentType: input.contentType };
        } catch (error) {
          // Forge não configurado em dev → o frontend cai no fallback data URL.
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              error instanceof Error && error.message.includes("Storage config")
                ? "Upload S3 não configurado (Forge env vars ausentes). Use data URL."
                : "Falha ao gerar URL de upload.",
          });
        }
      }),
  }),

  // Notification procedures — bell icon usa essas pra mostrar/marcar.
  notification: router({
    listMine: protectedProcedure
      .input(z.object({ onlyUnread: z.boolean().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return listNotificationsForUser(ctx.user.id, {
          onlyUnread: input?.onlyUnread,
        });
      }),

    countUnread: protectedProcedure.query(async ({ ctx }) => {
      return countUnreadNotifications(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.notificationId, ctx.user.id);
        return { ok: true } as const;
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { ok: true } as const;
    }),
  }),

  // Admin procedures — única porta de entrada pra dados agregados/cross-user.
  // Todas exigem role=admin (via adminProcedure).
  admin: router({
    listReferrals: adminProcedure
      .input(
        z
          .object({
            status: z.enum(["pending", "active", "paid", "cancelled"]).optional(),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        return listAllReferrals(input?.status);
      }),

    referralStats: adminProcedure.query(async () => {
      return getGlobalReferralStats();
    }),

    listDisputes: adminProcedure
      .input(
        z
          .object({ status: z.enum(["open", "resolved", "dismissed"]).optional() })
          .optional(),
      )
      .query(async ({ input }) => {
        return listAllDisputes(input?.status);
      }),

    resolveDispute: adminProcedure
      .input(
        z.object({
          disputeId: z.number(),
          newStatus: z.enum(["resolved", "dismissed"]),
          resolution: z.string().min(5, "Explique a decisão pra registro."),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getDispute(input.disputeId);
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Disputa não encontrada." });
        }
        if (existing.status !== "open") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Essa disputa já foi resolvida ou descartada.",
          });
        }
        const updated = await resolveDispute(
          input.disputeId,
          ctx.user.id,
          input.newStatus,
          input.resolution.trim(),
        );
        // Notifica quem abriu + outra parte da solicitação.
        const request = await getServiceRequest(existing.serviceRequestId);
        const recipients = new Set<number>([existing.openedByUserId]);
        if (request) {
          const clientUserId = await getClientProfileUserId(request.clientId);
          if (clientUserId) recipients.add(clientUserId);
          if (request.workerId) {
            const workerUserId = await getWorkerProfileUserId(request.workerId);
            if (workerUserId) recipients.add(workerUserId);
          }
        }
        await Promise.all(
          Array.from(recipients).map((uid) =>
            createNotification({
              userId: uid,
              type: "dispute_resolved",
              title:
                input.newStatus === "resolved"
                  ? "Disputa resolvida"
                  : "Disputa descartada pela equipe",
              body: input.resolution.slice(0, 200),
              linkPath: "/disputes",
              relatedId: existing.id,
            }),
          ),
        );
        return updated;
      }),
  }),

  // Specialty procedures
  specialties: router({
    list: publicProcedure.query(async () => {
      return listSpecialties();
    }),
  }),

  // Referral procedures — trampista cadastra uma empresa que indicou.
  // A primeira mensalidade paga vira comissão integral pro trampista.
  referral: router({
    create: rateLimited({ scope: "createReferral", max: 30, windowSec: 86400 })
      .input(
        z.object({
          clientCompanyName: z.string().min(2),
          clientContact: z.string().optional(),
          planChosen: z.enum(["basico", "pro", "premiere"]).optional(),
          firstPaymentAmount: z.string().optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "worker") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Só trampistas podem cadastrar indicações.",
          });
        }
        const created = await createReferral({
          trampistaUserId: ctx.user.id,
          clientCompanyName: input.clientCompanyName.trim(),
          clientContact: input.clientContact?.trim() || undefined,
          planChosen: input.planChosen,
          firstPaymentAmount: input.firstPaymentAmount,
          notes: input.notes?.trim() || undefined,
        });
        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao cadastrar indicação.",
          });
        }
        return created;
      }),

    // Indicações cadastradas pelo trampista logado.
    listMine: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "worker") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return listReferralsByTrampista(ctx.user.id);
    }),

    // Resumo agregado: total, contagem por status, valor total já pago.
    statsMine: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "worker") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getReferralStats(ctx.user.id);
    }),

    // Avança o status da indicação. Em produção é admin-only; no MVP em dev
    // permitimos que o próprio trampista dono da indicação avance pra demonstrar
    // o ciclo. Trocar pelo guard estrito quando tiver área administrativa.
    advanceStatus: protectedProcedure
      .input(
        z.object({
          referralId: z.number(),
          newStatus: z.enum(["pending", "active", "paid", "cancelled"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await getReferral(input.referralId);
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Indicação não encontrada." });
        }
        const isAdmin = ctx.user.role === "admin";
        const isOwner = existing.trampistaUserId === ctx.user.id;
        if (!isAdmin && !isOwner) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não tem permissão pra alterar essa indicação.",
          });
        }
        const updated = await updateReferralStatus(input.referralId, input.newStatus);
        if (!updated) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao atualizar status." });
        }
        // Notifica o trampista quando active ou paid.
        if (input.newStatus === "active" || input.newStatus === "paid") {
          await createNotification({
            userId: existing.trampistaUserId,
            type: input.newStatus === "paid" ? "referral_paid" : "referral_active",
            title:
              input.newStatus === "paid"
                ? "Comissão liberada!"
                : "Logista que você indicou virou ativo",
            body:
              input.newStatus === "paid"
                ? `R$ ${updated.firstPaymentAmount ?? "—"} de ${updated.clientCompanyName} caiu pra você.`
                : `${updated.clientCompanyName} assinou. Comissão será liberada na 1ª paga.`,
            linkPath: "/worker/referrals",
            relatedId: updated.id,
          });
        }
        return updated;
      }),
  }),

  // Review procedures
  review: router({
    create: protectedProcedure
      .input(
        z.object({
          serviceRequestId: z.number(),
          reviewedUserId: z.number(),
          rating: z.number().min(1).max(5),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const created = await createReview({
          serviceRequestId: input.serviceRequestId,
          reviewerId: ctx.user.id,
          reviewedUserId: input.reviewedUserId,
          rating: input.rating,
          comment: input.comment,
        });
        await recomputeUserRating(input.reviewedUserId);
        return created;
      }),

    // Higher-level helper used by the dashboards: pass requestId, the server
    // derives reviewerId (ctx.user) and reviewedUserId (the counterparty), and
    // refuses duplicate reviews from the same user on the same request.
    createForRequest: protectedProcedure
      .input(
        z.object({
          requestId: z.number(),
          rating: z.number().min(1).max(5),
          comment: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const request = await getServiceRequest(input.requestId);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada." });
        }
        if (request.status !== "completed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Só dá pra avaliar trampos concluídos.",
          });
        }
        const counterparty = await getCounterpartyUserId(input.requestId, ctx.user.id);
        if (!counterparty) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você não está nessa solicitação.",
          });
        }
        const existing = await getReviewsForRequest(input.requestId);
        if (existing.some((r) => r.reviewerId === ctx.user.id)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Você já avaliou esse trampo.",
          });
        }
        const created = await createReview({
          serviceRequestId: input.requestId,
          reviewerId: ctx.user.id,
          reviewedUserId: counterparty,
          rating: input.rating,
          comment: input.comment,
        });
        await recomputeUserRating(counterparty);
        // Notifica quem foi avaliado.
        await createNotification({
          userId: counterparty,
          type: "review_received",
          title: `Você recebeu ${input.rating} estrela${input.rating > 1 ? "s" : ""}`,
          body: input.comment ?? "Sem comentário.",
          linkPath: ctx.user.role === "worker" ? "/client" : "/worker",
          relatedId: input.requestId,
        });
        return created;
      }),

    listForRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .query(async ({ input }) => {
        return getReviewsForRequest(input.requestId);
      }),

    // Reviews the current user has authored. Frontend uses this to decide
    // whether to show "Avaliar" or "Avaliado ★ N" on a completed request.
    listMine: protectedProcedure.query(async ({ ctx }) => {
      return getReviewsByReviewer(ctx.user.id);
    }),

    getForUser: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getReviewsForUser(input.userId);
      }),
  }),
});

export type AppRouter = typeof appRouter;

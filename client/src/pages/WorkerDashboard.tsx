import DisputeDialog from "@/components/DisputeDialog";
import HowItWorks from "@/components/HowItWorks";
import ReviewDialog from "@/components/ReviewDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Calendar, Check, Clock, DollarSign, MapPin, Sparkles, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type RequestRow = {
  id: number;
  clientId: number;
  workerId: number | null;
  specialtyId: number;
  title: string;
  description: string | null;
  urgencyLevel: "low" | "medium" | "high" | "critical" | null;
  status: "requested" | "accepted" | "in_progress" | "completed" | "cancelled" | null;
  scheduledDate: Date | string | null;
  scheduledTime: string | null;
  estimatedDurationMinutes: number | null;
  proposedPrice: string | null;
  createdAt: Date | string;
  distanceKm?: number;
};

const URGENCY_STYLES: Record<string, string> = {
  low: "bg-brand-light/20 text-brand border-brand-light/40",
  medium: "bg-yellow/20 text-yellow-warm border-yellow/50",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  critical: "bg-destructive/15 text-destructive border-destructive/40",
};

const URGENCY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export default function WorkerDashboard() {
  const [, setLocation] = useLocation();
  const { data: profile } = trpc.worker.getProfile.useQuery();
  const { data: requests, isLoading } = trpc.worker.listRequests.useQuery();
  const { data: specialties } = trpc.specialties.list.useQuery();
  const { data: myReviews } = trpc.review.listMine.useQuery();
  const utils = trpc.useUtils();

  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [reviewingRequest, setReviewingRequest] = useState<RequestRow | null>(null);
  const [disputingRequest, setDisputingRequest] = useState<RequestRow | null>(null);

  const reviewedRequestIds = useMemo(() => {
    const s = new Set<number>();
    (myReviews ?? []).forEach((r) => s.add(r.serviceRequestId));
    return s;
  }, [myReviews]);

  const specialtyById = useMemo(() => {
    const m = new Map<number, string>();
    (specialties ?? []).forEach((s) => m.set(s.id, s.name));
    return m;
  }, [specialties]);

  const acceptMut = trpc.worker.acceptRequest.useMutation({
    onSuccess: () => {
      utils.worker.listRequests.invalidate();
      toast.success("Solicitação aceita!");
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMut = trpc.worker.rejectRequest.useMutation();

  const updateStatusMut = trpc.worker.updateStatus.useMutation({
    onSuccess: () => {
      utils.worker.listRequests.invalidate();
      toast.success("Status atualizado.");
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelAcceptedMut = trpc.worker.cancelAcceptedRequest.useMutation({
    onSuccess: () => {
      utils.worker.listRequests.invalidate();
      toast.success("Trampo liberado pra outro trampista.");
    },
    onError: (error) => toast.error(error.message),
  });

  const reject = (id: number) => {
    rejectMut.mutate({ requestId: id });
    setDismissed((prev) => new Set(prev).add(id));
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  const visible = ((requests ?? []) as RequestRow[]).filter((r) => !dismissed.has(r.id));
  const myWorkerProfileId = profile?.id ?? null;
  const open = visible.filter(
    (r) => r.workerId === null && r.status === "requested",
  );
  const mine = visible.filter((r) => r.workerId === myWorkerProfileId);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">
          Minhas solicitações
        </h1>
        <p className="text-muted-foreground mt-1">
          Match em minutos. Aceita, recusa ou atualiza o status dos trampos.
        </p>
      </div>

      <HowItWorks
        id="worker-dashboard"
        title="Como funciona o seu painel"
        subtitle="Dois blocos: trampos abertos pra você aceitar, e trampos que você já pegou."
        steps={[
          {
            title: "Disponíveis pra você",
            body: "Solicitações abertas que combinam com suas especialidades. Clica em Aceitar pra reservar — só uma pessoa pega, quem chegar primeiro leva. Dispensar só esconde da sua tela.",
          },
          {
            title: "Em andamento",
            body: "Tudo que você já aceitou. Use Começar quando chegar no local, Concluir quando terminar. Se precisar, Desistir devolve o trampo pra fila.",
          },
          {
            title: "Avaliar depois de concluído",
            body: "Quando o trampo fica Concluído, aparece um botão pra você avaliar o logista. Reputação cresce dos dois lados.",
          },
        ]}
        tip="O sininho no topo te avisa em tempo real quando aparece trampo novo na sua specialty."
      />

      {!profile && (
        <Card className="border-yellow/50 bg-yellow/10">
          <CardContent className="pt-6 flex items-start gap-4">
            <Sparkles className="h-5 w-5 text-yellow-warm shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Termina seu perfil pra começar a receber trampos</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adiciona bio, cidade e suas especialidades — assim a IA te encontra.
              </p>
            </div>
            <Button onClick={() => setLocation("/worker/profile")}>Completar</Button>
          </CardContent>
        </Card>
      )}

      {/* Open requests */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Disponíveis pra você ({open.length})
        </h2>
        {open.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Sem solicitações abertas nas suas especialidades agora.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {open.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                specialtyName={specialtyById.get(r.specialtyId) ?? "Especialidade"}
                actions={
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reject(r.id)}
                      disabled={rejectMut.isPending}
                    >
                      <X className="h-4 w-4" />
                      Dispensar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => acceptMut.mutate({ requestId: r.id })}
                      disabled={acceptMut.isPending}
                    >
                      <Check className="h-4 w-4" />
                      Aceitar
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* My assigned */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Em andamento ({mine.length})
        </h2>
        {mine.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Você ainda não aceitou nenhum trampo.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mine.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                specialtyName={specialtyById.get(r.specialtyId) ?? "Especialidade"}
                actions={
                  <>
                    <StatusBadge status={r.status} />
                    {r.status === "accepted" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatusMut.mutate({ requestId: r.id, status: "in_progress" })
                        }
                        disabled={updateStatusMut.isPending}
                      >
                        Começar
                      </Button>
                    )}
                    {r.status === "in_progress" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatusMut.mutate({ requestId: r.id, status: "completed" })
                        }
                        disabled={updateStatusMut.isPending}
                      >
                        Concluir
                      </Button>
                    )}
                    {r.status === "completed" &&
                      (reviewedRequestIds.has(r.id) ? (
                        <Badge variant="secondary" className="bg-brand-light/20 text-brand">
                          <Star className="h-3 w-3 fill-brand" /> Avaliado
                        </Badge>
                      ) : (
                        <Button size="sm" onClick={() => setReviewingRequest(r)}>
                          <Star className="h-4 w-4" /> Avaliar logista
                        </Button>
                      ))}
                    {(r.status === "accepted" || r.status === "in_progress") && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDisputingRequest(r)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <AlertTriangle className="h-4 w-4" /> Reportar problema
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Desistir do trampo? Ele volta pra fila de aberta pra outros trampistas.",
                              )
                            ) {
                              cancelAcceptedMut.mutate({ requestId: r.id });
                            }
                          }}
                          disabled={cancelAcceptedMut.isPending}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" /> Desistir
                        </Button>
                      </>
                    )}
                    {r.status === "completed" && !reviewedRequestIds.has(r.id) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDisputingRequest(r)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <AlertTriangle className="h-4 w-4" /> Reportar
                      </Button>
                    )}
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      {reviewingRequest && (
        <ReviewDialog
          open={!!reviewingRequest}
          onOpenChange={(open) => !open && setReviewingRequest(null)}
          requestId={reviewingRequest.id}
          requestTitle={reviewingRequest.title}
          reviewedLabel="o logista"
        />
      )}

      {disputingRequest && (
        <DisputeDialog
          open={!!disputingRequest}
          onOpenChange={(open) => !open && setDisputingRequest(null)}
          requestId={disputingRequest.id}
          requestTitle={disputingRequest.title}
        />
      )}
    </div>
  );
}

function RequestCard({
  request,
  specialtyName,
  actions,
}: {
  request: RequestRow;
  specialtyName: string;
  actions: React.ReactNode;
}) {
  const urgency = request.urgencyLevel ?? "medium";
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {specialtyName}
            </p>
            <h3 className="font-display font-bold text-lg leading-tight mt-1">
              {request.title}
            </h3>
          </div>
          <span
            className={`shrink-0 px-2 py-1 rounded-full border text-[10px] uppercase tracking-wider font-bold ${URGENCY_STYLES[urgency]}`}
          >
            {URGENCY_LABELS[urgency]}
          </span>
        </div>
        {request.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {request.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
          {request.scheduledDate && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(request.scheduledDate).toLocaleDateString("pt-BR")}
              {request.scheduledTime ? ` · ${request.scheduledTime}` : ""}
            </span>
          )}
          {request.estimatedDurationMinutes && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {request.estimatedDurationMinutes} min
            </span>
          )}
          {request.distanceKm != null && (
            <span className="inline-flex items-center gap-1 text-brand font-semibold">
              <MapPin className="h-3.5 w-3.5" />
              {request.distanceKm < 1
                ? `${Math.round(request.distanceKm * 1000)} m`
                : `${request.distanceKm.toFixed(1)} km`}
            </span>
          )}
          {request.proposedPrice && (
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              R$ {request.proposedPrice}
            </span>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t">{actions}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: RequestRow["status"] }) {
  const map: Record<string, { label: string; cls: string }> = {
    accepted: { label: "Aceita", cls: "bg-blue-100 text-blue-700" },
    in_progress: { label: "Em andamento", cls: "bg-yellow/20 text-yellow-warm" },
    completed: { label: "Concluída", cls: "bg-brand-light/20 text-brand" },
    cancelled: { label: "Cancelada", cls: "bg-muted text-muted-foreground" },
    requested: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
  };
  const key = status ?? "requested";
  const { label, cls } = map[key] ?? map.requested;
  return (
    <Badge variant="secondary" className={cls}>
      {label}
    </Badge>
  );
}

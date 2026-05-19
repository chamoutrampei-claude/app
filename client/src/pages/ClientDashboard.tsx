import DisputeDialog from "@/components/DisputeDialog";
import HowItWorks from "@/components/HowItWorks";
import ReviewDialog from "@/components/ReviewDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Calendar, Clock, DollarSign, FileText, Plus, Sparkles, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type RequestRow = {
  id: number;
  clientId: number;
  workerId: number | null;
  workerUserId: number | null;
  workerName: string | null;
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
};

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  requested: { label: "Aguardando trampista", cls: "bg-muted text-muted-foreground" },
  accepted: { label: "Aceita", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Em andamento", cls: "bg-yellow/20 text-yellow-warm" },
  completed: { label: "Concluída", cls: "bg-brand-light/20 text-brand" },
  cancelled: { label: "Cancelada", cls: "bg-destructive/15 text-destructive" },
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

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const { data: profile } = trpc.clientService.getProfile.useQuery();
  const { data: requests, isLoading } = trpc.clientService.listRequests.useQuery();
  const { data: specialties } = trpc.specialties.list.useQuery();
  const { data: myReviews } = trpc.review.listMine.useQuery();
  const utils = trpc.useUtils();

  const cancelMut = trpc.clientService.cancelRequest.useMutation({
    onSuccess: () => {
      utils.clientService.listRequests.invalidate();
      toast.success("Solicitação cancelada.");
    },
    onError: (error) => toast.error(error.message),
  });

  const [reviewing, setReviewing] = useState<RequestRow | null>(null);
  const [disputing, setDisputing] = useState<RequestRow | null>(null);

  const specialtyById = useMemo(() => {
    const m = new Map<number, string>();
    (specialties ?? []).forEach((s) => m.set(s.id, s.name));
    return m;
  }, [specialties]);

  const reviewedRequestIds = useMemo(() => {
    const s = new Set<number>();
    (myReviews ?? []).forEach((r) => s.add(r.serviceRequestId));
    return s;
  }, [myReviews]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const rows = (requests ?? []) as RequestRow[];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">
            Minhas solicitações
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe os trampos que você publicou.
          </p>
        </div>
        <Button onClick={() => setLocation("/client/request/new")}>
          <Plus className="h-4 w-4" />
          Nova solicitação
        </Button>
      </div>

      <HowItWorks
        id="client-dashboard"
        title="Como acompanhar suas solicitações"
        subtitle="Cada card mostra em que pé tá o trampo. Os status seguem essa ordem:"
        steps={[
          {
            marker: "1",
            title: "Aguardando trampista",
            body: "Você acabou de publicar. A IA está mostrando o trampo pros trampistas com a specialty certa.",
          },
          {
            marker: "2",
            title: "Aceita",
            body: "Alguém pegou. Você recebe notificação. Aguarde a chegada no horário combinado.",
          },
          {
            marker: "3",
            title: "Em andamento → Concluída",
            body: "O trampista marca quando começou e quando terminou. Quando virar Concluída, você pode avaliar.",
          },
        ]}
        tip="Trampista desistiu? O sistema devolve a vaga pra fila automaticamente e tenta achar outra pessoa."
      />

      {!profile && (
        <Card className="border-yellow/50 bg-yellow/10">
          <CardContent className="pt-6 flex items-start gap-4">
            <Sparkles className="h-5 w-5 text-yellow-warm shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Completa o perfil da empresa pra publicar</p>
              <p className="text-sm text-muted-foreground mt-1">
                Os trampistas precisam saber quem está chamando.
              </p>
            </div>
            <Button onClick={() => setLocation("/client/profile")}>Completar</Button>
          </CardContent>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <div className="text-4xl">🚀</div>
            <p className="font-display font-bold text-lg">Bora trampear?</p>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Você ainda não publicou solicitações. Clica em "Nova solicitação" e
              o match começa em minutos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const urgency = r.urgencyLevel ?? "medium";
            const status = r.status ?? "requested";
            const statusInfo = STATUS_STYLES[status];
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {specialtyById.get(r.specialtyId) ?? "Especialidade"}
                      </p>
                      <h3 className="font-display font-bold text-lg mt-1">{r.title}</h3>
                      {r.description && (
                        <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                          {r.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant="secondary" className={statusInfo.cls}>
                        {statusInfo.label}
                      </Badge>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-bold ${URGENCY_STYLES[urgency]}`}
                      >
                        {URGENCY_LABELS[urgency]}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-3 mt-3 border-t">
                    {r.scheduledDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(r.scheduledDate).toLocaleDateString("pt-BR")}
                        {r.scheduledTime ? ` · ${r.scheduledTime}` : ""}
                      </span>
                    )}
                    {r.estimatedDurationMinutes && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {r.estimatedDurationMinutes} min
                      </span>
                    )}
                    {r.proposedPrice && (
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        R$ {r.proposedPrice}
                      </span>
                    )}
                    <span className="ml-auto text-[10px]">
                      Publicada {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {r.workerUserId != null && (
                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        Trampista designado:{" "}
                        <strong className="text-foreground">
                          {r.workerName ?? `#${r.workerUserId}`}
                        </strong>
                      </p>
                      <Link href={`/trampista/${r.workerUserId}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4" /> Ver currículo
                        </Button>
                      </Link>
                    </div>
                  )}
                  {status === "completed" && (
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
                      {reviewedRequestIds.has(r.id) ? (
                        <Badge variant="secondary" className="bg-brand-light/20 text-brand">
                          <Star className="h-3 w-3 fill-brand" /> Trampista avaliado
                        </Badge>
                      ) : (
                        <Button size="sm" onClick={() => setReviewing(r)}>
                          <Star className="h-4 w-4" /> Avaliar trampista
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDisputing(r)}>
                        <AlertTriangle className="h-4 w-4" /> Reportar problema
                      </Button>
                    </div>
                  )}
                  {(status === "in_progress" || status === "accepted") && (
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDisputing(r)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <AlertTriangle className="h-4 w-4" /> Reportar problema
                      </Button>
                    </div>
                  )}
                  {status !== "completed" && status !== "cancelled" && (
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Cancelar essa solicitação? Não dá pra desfazer.",
                            )
                          ) {
                            cancelMut.mutate({ requestId: r.id });
                          }
                        }}
                        disabled={cancelMut.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" /> Cancelar solicitação
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {reviewing && (
        <ReviewDialog
          open={!!reviewing}
          onOpenChange={(open) => !open && setReviewing(null)}
          requestId={reviewing.id}
          requestTitle={reviewing.title}
          reviewedLabel="o trampista"
        />
      )}

      {disputing && (
        <DisputeDialog
          open={!!disputing}
          onOpenChange={(open) => !open && setDisputing(null)}
          requestId={disputing.id}
          requestTitle={disputing.title}
        />
      )}
    </div>
  );
}

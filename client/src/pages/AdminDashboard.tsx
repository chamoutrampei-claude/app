import HowItWorks from "@/components/HowItWorks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Check,
  DollarSign,
  HandCoins,
  Handshake,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Status = "pending" | "active" | "paid" | "cancelled";
type Plan = "basico" | "pro" | "premiere";

const PLAN_LABEL: Record<Plan, string> = {
  basico: "Básico",
  pro: "Pro",
  premiere: "Premiere",
};

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  pending: { label: "Aguardando", cls: "bg-muted text-muted-foreground" },
  active: { label: "Logista ativo", cls: "bg-blue-100 text-blue-700" },
  paid: { label: "Comissão paga", cls: "bg-brand-light/20 text-brand" },
  cancelled: { label: "Cancelada", cls: "bg-destructive/15 text-destructive" },
};

const FILTERS: { value: Status | "all"; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "pending", label: "Aguardando" },
  { value: "active", label: "Ativas" },
  { value: "paid", label: "Pagas" },
  { value: "cancelled", label: "Canceladas" },
];

function currency(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export default function AdminDashboard() {
  const [filter, setFilter] = useState<Status | "all">("all");
  const { data: stats, isLoading: loadingStats } = trpc.admin.referralStats.useQuery();
  const { data: referrals, isLoading: loadingReferrals } = trpc.admin.listReferrals.useQuery(
    filter === "all" ? undefined : { status: filter },
  );
  const utils = trpc.useUtils();

  const advance = trpc.referral.advanceStatus.useMutation({
    onSuccess: () => {
      utils.admin.listReferrals.invalidate();
      utils.admin.referralStats.invalidate();
      toast.success("Status atualizado.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-yellow-warm font-bold mb-1 inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin
          </p>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">
            Indicações (visão global)
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanha o pipeline de indicações de todos os trampistas e libera as comissões.
          </p>
        </div>
      </div>

      <HowItWorks
        id="admin-dashboard"
        title="Sua responsabilidade aqui"
        subtitle="Você é quem confirma que cada indicação avançou de etapa — o sistema não faz isso sozinho."
        steps={[
          {
            marker: "1",
            title: "Aguardando → Logista ativo",
            body: "Quando o logista cria conta no sistema de pagamento e assina o plano, clique 'Marcar como ativa' aqui.",
          },
          {
            marker: "2",
            title: "Ativa → Comissão paga",
            body: "Quando você confirmar que o logista pagou a 1ª mensalidade, libere com 'Liberar comissão'. O trampista é notificado na hora.",
          },
          {
            marker: "✕",
            title: "Cancelada",
            body: "Logista desistiu antes de pagar? Cancela — não vira comissão.",
          },
        ]}
        tip="Os valores nos stats já refletem o pipeline: 'Pipeline em aberto' = soma das pendentes + ativas. 'Comissões pagas' = soma das pagas."
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Handshake}
          label="Total"
          value={loadingStats ? "—" : String(stats?.total ?? 0)}
        />
        <StatCard
          icon={Users}
          label="Trampistas indicando"
          value={loadingStats ? "—" : String(stats?.uniqueTrampistas ?? 0)}
        />
        <StatCard
          icon={TrendingUp}
          label="Pipeline em aberto"
          value={loadingStats ? "—" : `R$ ${currency(stats?.totalPipelineValue ?? 0)}`}
          hint="Pendentes + ativas"
        />
        <StatCard
          icon={HandCoins}
          label="Comissões pagas"
          value={loadingStats ? "—" : `R$ ${currency(stats?.totalCommissionsPaid ?? 0)}`}
          accent
        />
      </div>

      {/* Status breakdown chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.value === "all"
              ? stats?.total ?? 0
              : stats?.byStatus[f.value as Status] ?? 0;
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors inline-flex items-center gap-2 ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-foreground hover:border-primary/50"
              }`}
            >
              {f.label}
              <span
                className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-full ${
                  active ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Referrals list */}
      {loadingReferrals ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (referrals ?? []).length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
            Sem indicações nessa categoria.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(referrals ?? []).map((r) => {
            const status = (r.status ?? "pending") as Status;
            const sty = STATUS_STYLES[status];
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-lg">
                          {r.clientCompanyName}
                        </h3>
                        <Badge variant="secondary" className={sty.cls}>
                          {sty.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Indicada por <strong className="text-foreground">{r.trampistaName ?? `Trampista #${r.trampistaUserId}`}</strong>
                        {r.trampistaEmail && (
                          <span className="text-muted-foreground/70"> · {r.trampistaEmail}</span>
                        )}
                      </p>
                      {r.clientContact && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Contato: {r.clientContact}
                        </p>
                      )}
                      {r.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{r.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-3 mt-3 border-t">
                    <span className="px-2 py-0.5 rounded-full bg-secondary font-semibold">
                      Plano {PLAN_LABEL[(r.planChosen ?? "basico") as Plan]}
                    </span>
                    {r.firstPaymentAmount && (
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <DollarSign className="h-3.5 w-3.5" />
                        R$ {r.firstPaymentAmount}
                      </span>
                    )}
                    <span className="text-[10px]">
                      Indicada {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    {r.activatedAt && (
                      <span className="text-[10px]">
                        Ativada {new Date(r.activatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    {r.paidAt && (
                      <span className="text-[10px] text-brand font-semibold">
                        Paga {new Date(r.paidAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                  {status !== "paid" && status !== "cancelled" && (
                    <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t">
                      {status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            advance.mutate({ referralId: r.id, newStatus: "active" })
                          }
                          disabled={advance.isPending}
                        >
                          <Check className="h-4 w-4" /> Marcar como ativa
                        </Button>
                      )}
                      {status === "active" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            advance.mutate({ referralId: r.id, newStatus: "paid" })
                          }
                          disabled={advance.isPending}
                        >
                          <DollarSign className="h-4 w-4" /> Liberar comissão (paga)
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          advance.mutate({
                            referralId: r.id,
                            newStatus: "cancelled",
                          })
                        }
                        disabled={advance.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                      >
                        <X className="h-4 w-4" /> Cancelar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-yellow bg-yellow/10" : undefined}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {label}
          </p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="font-display font-extrabold text-2xl tabular-nums mt-1">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}

import HowItWorks from "@/components/HowItWorks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, ChevronDown, ChevronUp, DollarSign, Handshake, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Plan = "basico" | "pro" | "premiere";

const PLAN_PRICES: Record<Plan, { label: string; promo: string; full: string }> = {
  basico: { label: "Básico", promo: "49.00", full: "99.00" },
  pro: { label: "Pro", promo: "147.00", full: "297.00" },
  premiere: { label: "Premiere", promo: "347.00", full: "697.00" },
};

const STATUS_STYLES: Record<string, { label: string; cls: string; hint: string }> = {
  pending: {
    label: "Aguardando",
    cls: "bg-muted text-muted-foreground",
    hint: "Logista ainda não assinou",
  },
  active: {
    label: "Logista ativo",
    cls: "bg-blue-100 text-blue-700",
    hint: "Assinou — comissão será liberada quando a 1ª mensalidade for paga",
  },
  paid: {
    label: "Comissão paga",
    cls: "bg-brand-light/20 text-brand",
    hint: "Você já recebeu",
  },
  cancelled: {
    label: "Cancelada",
    cls: "bg-destructive/15 text-destructive",
    hint: "Logista cancelou antes de pagar",
  },
};

type FormState = {
  clientCompanyName: string;
  clientContact: string;
  planChosen: Plan;
  firstPaymentAmount: string;
  notes: string;
};

const EMPTY: FormState = {
  clientCompanyName: "",
  clientContact: "",
  planChosen: "basico",
  firstPaymentAmount: "",
  notes: "",
};

export default function WorkerReferrals() {
  const { data: referrals, isLoading } = trpc.referral.listMine.useQuery();
  const { data: stats } = trpc.referral.statsMine.useQuery();
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const create = trpc.referral.create.useMutation({
    onSuccess: () => {
      utils.referral.listMine.invalidate();
      utils.referral.statsMine.invalidate();
      toast.success("Indicação cadastrada!");
      setForm(EMPTY);
      setOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const advance = trpc.referral.advanceStatus.useMutation({
    onSuccess: () => {
      utils.referral.listMine.invalidate();
      utils.referral.statsMine.invalidate();
      toast.success("Status atualizado.");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientCompanyName.trim()) {
      toast.error("Nome da empresa é obrigatório.");
      return;
    }
    create.mutate({
      clientCompanyName: form.clientCompanyName,
      clientContact: form.clientContact || undefined,
      planChosen: form.planChosen,
      firstPaymentAmount:
        form.firstPaymentAmount || PLAN_PRICES[form.planChosen].promo,
      notes: form.notes || undefined,
    });
  };

  const fillSuggested = (plan: Plan) => {
    setForm({ ...form, planChosen: plan, firstPaymentAmount: PLAN_PRICES[plan].promo });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">
          Minhas indicações
        </h1>
        <p className="text-muted-foreground mt-1">
          Apresentou a Trampei pra uma empresa e fechou? A primeira mensalidade vai 100% pra você.
        </p>
      </div>

      <HowItWorks
        id="worker-referrals"
        title="Como funciona a comissão"
        subtitle="Trampista que apresenta a Trampei pra um logista leva a 1ª mensalidade inteira."
        steps={[
          {
            title: "Você apresenta",
            body: "Conhece um dono de padaria, pizzaria, mercadinho? Mostra a Trampei pra ele.",
          },
          {
            title: "Logista assina",
            body: "Quando ele escolher um plano, vem aqui e cadastra a indicação pra você ficar atrelado.",
          },
          {
            title: "1ª mensalidade = sua",
            body: "Quando o logista paga a 1ª mensalidade, o valor inteiro vira sua comissão.",
          },
          {
            title: "2º mês em diante",
            body: "A mensalidade volta pra plataforma normalmente. Sua comissão é só na 1ª parcela.",
          },
        ]}
        tip="Quanto mais caro o plano que o logista escolher, maior sua comissão. Premiere = R$ 347 na 1ª paga."
        variant="yellow"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats?.total ?? 0} />
        <StatCard label="Aguardando" value={stats?.byStatus.pending ?? 0} />
        <StatCard label="Ativas" value={stats?.byStatus.active ?? 0} />
        <StatCard
          label="Já recebido"
          value={`R$ ${(stats?.totalEarned ?? 0).toFixed(2).replace(".", ",")}`}
          accent
        />
      </div>

      {/* New referral form (collapsible) */}
      <Card>
        <CardContent className="pt-6">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display font-bold">Cadastrar nova indicação</p>
                <p className="text-xs text-muted-foreground">
                  Atrela um logista que você apresentou à Trampei.
                </p>
              </div>
            </div>
            {open ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {open && (
            <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t space-y-5">
              <div>
                <Label htmlFor="company">
                  Nome da empresa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company"
                  required
                  placeholder="Ex: Padaria Pão Quente"
                  value={form.clientCompanyName}
                  onChange={(e) =>
                    setForm({ ...form, clientCompanyName: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="contact">Contato (WhatsApp ou e-mail)</Label>
                <Input
                  id="contact"
                  placeholder="(12) 9 9999-9999 ou empresa@email.com"
                  value={form.clientContact}
                  onChange={(e) => setForm({ ...form, clientContact: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Plano escolhido</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(Object.keys(PLAN_PRICES) as Plan[]).map((p) => {
                    const selected = form.planChosen === p;
                    const price = PLAN_PRICES[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => fillSuggested(p)}
                        className={`rounded-lg border-2 p-3 text-left transition-all ${
                          selected
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <p className="font-display font-bold">{price.label}</p>
                        <p className="text-xs text-muted-foreground line-through tabular-nums">
                          R$ {price.full}
                        </p>
                        <p className="text-sm font-bold text-brand tabular-nums">
                          R$ {price.promo}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Valor da 1ª mensalidade (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={PLAN_PRICES[form.planChosen].promo}
                  value={form.firstPaymentAmount}
                  onChange={(e) =>
                    setForm({ ...form, firstPaymentAmount: e.target.value })
                  }
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Pré-preenchido com o promo do plano. Edita se for diferente.
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Como apresentou, contexto, próximo follow-up…"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    setForm(EMPTY);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Salvando..." : "Cadastrar indicação"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Histórico ({referrals?.length ?? 0})
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (referrals ?? []).length === 0 ? (
          <Card>
            <CardContent className="pt-10 pb-10 text-center space-y-3">
              <Sparkles className="h-8 w-8 mx-auto text-yellow-warm" />
              <p className="font-display font-bold text-lg">Sem indicações ainda</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Apresentou a Trampei pra alguém? Cadastra aqui pra a comissão da primeira
                mensalidade ficar com você.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(referrals ?? []).map((r) => {
              const status = r.status ?? "pending";
              const sty = STATUS_STYLES[status];
              return (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-bold text-lg">
                          {r.clientCompanyName}
                        </h3>
                        {r.clientContact && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.clientContact}
                          </p>
                        )}
                        {r.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            "{r.notes}"
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge variant="secondary" className={sty.cls}>
                          {sty.label}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground text-right">
                          {sty.hint}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-3 mt-3 border-t">
                      <span className="px-2 py-0.5 rounded-full bg-secondary font-semibold">
                        Plano {PLAN_PRICES[(r.planChosen ?? "basico") as Plan].label}
                      </span>
                      {r.firstPaymentAmount && (
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          R$ {r.firstPaymentAmount}
                          <span className="text-muted-foreground font-normal">/ comissão</span>
                        </span>
                      )}
                      <span className="ml-auto text-[10px]">
                        Indicada {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {/* Status advance actions */}
                    {status !== "paid" && status !== "cancelled" && (
                      <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t">
                        {status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              advance.mutate({
                                referralId: r.id,
                                newStatus: "active",
                              })
                            }
                            disabled={advance.isPending}
                          >
                            <Check className="h-4 w-4" /> Logista assinou
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
                            <DollarSign className="h-4 w-4" /> Marcar 1ª paga
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
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-yellow bg-yellow/10" : undefined}>
      <CardContent className="pt-5 pb-5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
        <p className="font-display font-extrabold text-2xl tabular-nums mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

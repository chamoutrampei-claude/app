import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, DollarSign } from "lucide-react";
import { useMemo, useState } from "react";

type Status = "requested" | "accepted" | "in_progress" | "completed" | "cancelled";

type RequestRow = {
  id: number;
  clientId: number;
  workerId: number | null;
  specialtyId: number;
  title: string;
  description: string | null;
  urgencyLevel: "low" | "medium" | "high" | "critical" | null;
  status: Status | null;
  scheduledDate: Date | string | null;
  scheduledTime: string | null;
  estimatedDurationMinutes: number | null;
  proposedPrice: string | null;
  createdAt: Date | string;
};

type Filter = "all" | "open" | "active" | "done" | "cancelled";

const FILTERS: { value: Filter; label: string; matches: (s: Status | null) => boolean }[] = [
  { value: "all", label: "Tudo", matches: () => true },
  { value: "open", label: "Em aberto", matches: (s) => s === "requested" },
  { value: "active", label: "Em andamento", matches: (s) => s === "accepted" || s === "in_progress" },
  { value: "done", label: "Concluídas", matches: (s) => s === "completed" },
  { value: "cancelled", label: "Canceladas", matches: (s) => s === "cancelled" },
];

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  requested: { label: "Aguardando", cls: "bg-muted text-muted-foreground" },
  accepted: { label: "Aceita", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Em andamento", cls: "bg-yellow/20 text-yellow-warm" },
  completed: { label: "Concluída", cls: "bg-brand-light/20 text-brand" },
  cancelled: { label: "Cancelada", cls: "bg-destructive/15 text-destructive" },
};

export default function History() {
  const { user } = useAuth();
  const role = user?.role;

  const workerQuery = trpc.worker.listRequests.useQuery(undefined, {
    enabled: role === "worker",
  });
  const clientQuery = trpc.clientService.listRequests.useQuery(undefined, {
    enabled: role === "client",
  });
  const { data: specialties } = trpc.specialties.list.useQuery();
  const { data: workerProfile } = trpc.worker.getProfile.useQuery(undefined, {
    enabled: role === "worker",
  });

  const [filter, setFilter] = useState<Filter>("all");

  const specialtyById = useMemo(() => {
    const m = new Map<number, string>();
    (specialties ?? []).forEach((s) => m.set(s.id, s.name));
    return m;
  }, [specialties]);

  const allRows: RequestRow[] =
    role === "worker"
      ? ((workerQuery.data ?? []) as RequestRow[]).filter(
          // Only show what's actually mine in history (skip open offers).
          (r) => r.workerId !== null && r.workerId === workerProfile?.id,
        )
      : ((clientQuery.data ?? []) as RequestRow[]);

  const isLoading = role === "worker" ? workerQuery.isLoading : clientQuery.isLoading;

  const matcher = FILTERS.find((f) => f.value === filter)!.matches;
  const rows = allRows.filter((r) => matcher(r.status as Status | null));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">Histórico</h1>
        <p className="text-muted-foreground mt-1">
          Tudo que você {role === "worker" ? "trampou" : "publicou"} até agora.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = allRows.filter((r) => f.matches(r.status as Status | null)).length;
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

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
            Sem trampos nesta categoria.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const status = (r.status ?? "requested") as Status;
            const s = STATUS_STYLES[status];
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
                    <Badge variant="secondary" className={s.cls}>
                      {s.label}
                    </Badge>
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
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";

const STATUS_STYLES: Record<string, { label: string; cls: string; icon: typeof ShieldCheck }> = {
  open: { label: "Em análise", cls: "bg-yellow/20 text-yellow-warm", icon: AlertTriangle },
  resolved: { label: "Resolvida", cls: "bg-brand-light/20 text-brand", icon: ShieldCheck },
  dismissed: { label: "Descartada", cls: "bg-muted text-muted-foreground", icon: X },
};

const SEVERITY_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export default function Disputes() {
  const { data: disputes, isLoading } = trpc.dispute.listMine.useQuery();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">
          Minhas disputas
        </h1>
        <p className="text-muted-foreground mt-1">
          Problemas que você abriu sobre solicitações. A equipe TRAMPEI analisa e responde.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (disputes ?? []).length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <ShieldCheck className="h-8 w-8 mx-auto text-brand" />
            <p className="font-display font-bold text-lg">Sem disputas abertas</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Tomara que continue assim! Se algo der errado, abra uma disputa
              direto no card da solicitação.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(disputes ?? []).map((d) => {
            const sty = STATUS_STYLES[d.status ?? "open"];
            const Icon = sty.icon;
            return (
              <Card key={d.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary" className={sty.cls}>
                        {sty.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Urgência: <strong>{SEVERITY_LABEL[d.severity ?? "medium"]}</strong>
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Aberta em {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Solicitação #{d.serviceRequestId}
                    </p>
                    <p className="text-sm mt-1.5 leading-relaxed whitespace-pre-line">
                      {d.reason}
                    </p>
                  </div>
                  {d.resolution && (
                    <div className="pt-3 border-t">
                      <p className="text-[10px] uppercase tracking-wider text-brand font-semibold">
                        Resposta da equipe
                      </p>
                      <p className="text-sm mt-1.5 leading-relaxed whitespace-pre-line">
                        {d.resolution}
                      </p>
                      {d.resolvedAt && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Resolvida em {new Date(d.resolvedAt).toLocaleDateString("pt-BR")}
                        </p>
                      )}
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

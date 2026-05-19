import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Check, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  open: { label: "Em análise", cls: "bg-yellow/20 text-yellow-warm" },
  resolved: { label: "Resolvida", cls: "bg-brand-light/20 text-brand" },
  dismissed: { label: "Descartada", cls: "bg-muted text-muted-foreground" },
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-brand-light/20 text-brand",
  medium: "bg-yellow/20 text-yellow-warm",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-destructive/15 text-destructive",
};

const FILTERS: { value: "all" | "open" | "resolved" | "dismissed"; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "open", label: "Em análise" },
  { value: "resolved", label: "Resolvidas" },
  { value: "dismissed", label: "Descartadas" },
];

type ResolveTarget = {
  id: number;
  requestTitle: string | null;
  reason: string;
};

export default function AdminDisputes() {
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "dismissed">("open");
  const { data: disputes, isLoading } = trpc.admin.listDisputes.useQuery(
    filter === "all" ? undefined : { status: filter },
  );
  const utils = trpc.useUtils();

  const [resolving, setResolving] = useState<ResolveTarget | null>(null);
  const [resolution, setResolution] = useState("");
  const [decision, setDecision] = useState<"resolved" | "dismissed">("resolved");

  const resolveMut = trpc.admin.resolveDispute.useMutation({
    onSuccess: () => {
      utils.admin.listDisputes.invalidate();
      toast.success("Disputa atualizada.");
      setResolving(null);
      setResolution("");
    },
    onError: (error) => toast.error(error.message),
  });

  const submitResolve = () => {
    if (!resolving) return;
    resolveMut.mutate({
      disputeId: resolving.id,
      newStatus: decision,
      resolution: resolution.trim(),
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-yellow-warm font-bold mb-1 inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Admin
        </p>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">Disputas</h1>
        <p className="text-muted-foreground mt-1">
          Reclamações abertas por trampistas e logistas. Resolva escrevendo a decisão
          — as partes envolvidas são notificadas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-foreground hover:border-primary/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (disputes ?? []).length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
            Sem disputas nessa categoria.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(disputes ?? []).map((d) => {
            const sty = STATUS_STYLES[d.status ?? "open"];
            return (
              <Card key={d.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <Badge variant="secondary" className={sty.cls}>
                        {sty.label}
                      </Badge>
                      <Badge variant="secondary" className={SEVERITY_STYLES[d.severity ?? "medium"]}>
                        Urgência {d.severity}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Solicitação #{d.serviceRequestId}: {d.requestTitle ?? "(sem título)"}
                    </p>
                    <p className="text-sm mt-1.5">
                      Aberta por{" "}
                      <strong>{d.openedByName ?? `Usuário #${d.openedByUserId}`}</strong>
                    </p>
                  </div>

                  <div className="bg-secondary/40 rounded-lg p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      Relato
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-line">{d.reason}</p>
                  </div>

                  {d.resolution && (
                    <div className="border-l-4 border-brand pl-4">
                      <p className="text-[10px] uppercase tracking-wider text-brand font-semibold mb-1.5">
                        Decisão
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {d.resolution}
                      </p>
                      {d.resolvedAt && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Resolvida em {new Date(d.resolvedAt).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                  )}

                  {d.status === "open" && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        onClick={() => {
                          setResolving({
                            id: d.id,
                            requestTitle: d.requestTitle,
                            reason: d.reason,
                          });
                          setDecision("resolved");
                        }}
                      >
                        <Check className="h-4 w-4" /> Resolver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setResolving({
                            id: d.id,
                            requestTitle: d.requestTitle,
                            reason: d.reason,
                          });
                          setDecision("dismissed");
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" /> Descartar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!resolving} onOpenChange={(o) => !o && setResolving(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {decision === "resolved" ? "Resolver disputa" : "Descartar disputa"}
            </DialogTitle>
            <DialogDescription>
              {resolving?.requestTitle ?? "Disputa"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="resolution">Decisão / explicação</Label>
              <Textarea
                id="resolution"
                rows={5}
                placeholder={
                  decision === "resolved"
                    ? "Ex: Reembolso parcial autorizado. Trampista será orientado."
                    : "Ex: Sem evidência de problema. Trampo concluído conforme acordo."
                }
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                As partes envolvidas vão ler isso. Seja claro e respeitoso.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResolving(null)}>
              Cancelar
            </Button>
            <Button
              onClick={submitResolve}
              disabled={resolveMut.isPending || resolution.trim().length < 5}
            >
              {resolveMut.isPending
                ? "Salvando..."
                : decision === "resolved"
                  ? "Confirmar resolução"
                  : "Confirmar descarte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

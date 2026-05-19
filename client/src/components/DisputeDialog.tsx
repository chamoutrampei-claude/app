import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Severity = "low" | "medium" | "high" | "critical";

const SEVERITY_OPTIONS: { value: Severity; label: string; hint: string; cls: string }[] = [
  {
    value: "low",
    label: "Baixa",
    hint: "Reclamação, registro",
    cls: "bg-brand-light/20 text-brand border-brand-light/40",
  },
  {
    value: "medium",
    label: "Média",
    hint: "Revisar quando puder",
    cls: "bg-yellow/20 text-yellow-warm border-yellow/40",
  },
  {
    value: "high",
    label: "Alta",
    hint: "Resolver hoje",
    cls: "bg-orange-100 text-orange-700 border-orange-300",
  },
  {
    value: "critical",
    label: "Crítica",
    hint: "Fraude / urgente",
    cls: "bg-destructive/15 text-destructive border-destructive/40",
  },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: number;
  requestTitle: string;
};

export default function DisputeDialog({ open, onOpenChange, requestId, requestTitle }: Props) {
  const [severity, setSeverity] = useState<Severity>("medium");
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();

  const create = trpc.dispute.create.useMutation({
    onSuccess: () => {
      toast.success("Disputa aberta. A equipe vai revisar.");
      utils.dispute.listMine.invalidate();
      onOpenChange(false);
      setReason("");
      setSeverity("medium");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = () => {
    create.mutate({ serviceRequestId: requestId, reason: reason.trim(), severity });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Reportar problema
          </DialogTitle>
          <DialogDescription>
            Trampo: <span className="font-semibold">{requestTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label>Urgência</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SEVERITY_OPTIONS.map((s) => {
                const selected = severity === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSeverity(s.value)}
                    className={`text-left rounded-lg border-2 p-2.5 transition-all ${
                      selected ? "border-primary ring-2 ring-primary/20" : "border-border"
                    } ${s.cls}`}
                  >
                    <p className="font-bold text-sm">{s.label}</p>
                    <p className="text-xs opacity-80">{s.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="dispute-reason">
              O que aconteceu? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="dispute-reason"
              rows={5}
              placeholder="Detalhe o problema. Quanto mais contexto, mais rápido a equipe resolve."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Mínimo 10 caracteres. A outra parte e a equipe TRAMPEI vão ver.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending || reason.trim().length < 10}
          >
            {create.isPending ? "Abrindo..." : "Abrir disputa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

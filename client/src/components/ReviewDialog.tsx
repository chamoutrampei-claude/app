import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: number;
  requestTitle: string;
  reviewedLabel: string; // e.g. "o trampista" / "o logista"
  onSuccess?: () => void;
};

export default function ReviewDialog({
  open,
  onOpenChange,
  requestId,
  requestTitle,
  reviewedLabel,
  onSuccess,
}: Props) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const utils = trpc.useUtils();

  const create = trpc.review.createForRequest.useMutation({
    onSuccess: () => {
      toast.success("Avaliação enviada!");
      utils.review.listForRequest.invalidate({ requestId });
      utils.review.listMine.invalidate();
      utils.worker.listRequests.invalidate();
      utils.clientService.listRequests.invalidate();
      onSuccess?.();
      onOpenChange(false);
      // Reset for next time
      setRating(5);
      setComment("");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = () => {
    create.mutate({ requestId, rating, comment: comment.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Avaliar {reviewedLabel}</DialogTitle>
          <DialogDescription>
            Trampo: <span className="font-semibold">{requestTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <p className="text-sm font-semibold mb-3">Sua nota</p>
            <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hover || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    className="transition-transform hover:scale-110"
                    aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        filled ? "fill-yellow text-yellow" : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-3 text-sm text-muted-foreground tabular-nums">
                {rating}/5
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Comentário (opcional)</p>
            <Textarea
              rows={4}
              placeholder="Conta como foi a experiência. Aparece no histórico público."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

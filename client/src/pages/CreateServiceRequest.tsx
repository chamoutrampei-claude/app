import GeolocationField from "@/components/GeolocationField";
import HowItWorks from "@/components/HowItWorks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Urgency = "low" | "medium" | "high" | "critical";

const URGENCIES: { value: Urgency; label: string; hint: string; cls: string }[] = [
  {
    value: "low",
    label: "Baixa",
    hint: "Pode esperar",
    cls: "bg-brand-light/20 text-brand border-brand-light/40 hover:bg-brand-light/30",
  },
  {
    value: "medium",
    label: "Média",
    hint: "Próximos dias",
    cls: "bg-yellow/20 text-yellow-warm border-yellow/40 hover:bg-yellow/30",
  },
  {
    value: "high",
    label: "Alta",
    hint: "Hoje ou amanhã",
    cls: "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200",
  },
  {
    value: "critical",
    label: "Crítica",
    hint: "Agora",
    cls: "bg-destructive/15 text-destructive border-destructive/40 hover:bg-destructive/25",
  },
];

type FormState = {
  title: string;
  description: string;
  specialtyId: string;
  urgencyLevel: Urgency;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDurationMinutes: string;
  proposedPrice: string;
  latitude: number | null;
  longitude: number | null;
};

const EMPTY: FormState = {
  title: "",
  description: "",
  specialtyId: "",
  urgencyLevel: "medium",
  scheduledDate: "",
  scheduledTime: "",
  estimatedDurationMinutes: "",
  proposedPrice: "",
  latitude: null,
  longitude: null,
};

export default function CreateServiceRequest() {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: loadingProfile } = trpc.clientService.getProfile.useQuery();
  const { data: specialties, isLoading: loadingSpecialties } = trpc.specialties.list.useQuery();
  const utils = trpc.useUtils();

  const [form, setForm] = useState<FormState>(EMPTY);

  const create = trpc.clientService.createRequest.useMutation({
    onSuccess: () => {
      utils.clientService.listRequests.invalidate();
      toast.success("Solicitação publicada!");
      setLocation("/client");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.specialtyId) {
      toast.error("Preenche título, descrição e especialidade.");
      return;
    }
    create.mutate({
      specialtyId: Number(form.specialtyId),
      title: form.title.trim(),
      description: form.description.trim(),
      urgencyLevel: form.urgencyLevel,
      scheduledDate: form.scheduledDate || undefined,
      scheduledTime: form.scheduledTime || undefined,
      estimatedDurationMinutes: form.estimatedDurationMinutes
        ? Number(form.estimatedDurationMinutes)
        : undefined,
      proposedPrice: form.proposedPrice || undefined,
      locationLatitude: form.latitude ?? undefined,
      locationLongitude: form.longitude ?? undefined,
    });
  };

  if (loadingProfile) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  // Client without a profile yet — guide them to /client/profile first.
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-2xl font-display font-extrabold">
              Antes de publicar, complete o perfil da empresa
            </h1>
            <p className="text-muted-foreground">
              Os trampistas precisam saber quem está chamando. Leva 30 segundos.
            </p>
            <Button onClick={() => setLocation("/client/profile")}>
              Ir para o perfil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">Nova solicitação</h1>
        <p className="text-muted-foreground mt-1">
          Quanto mais detalhe, mais rápido o match certo chega.
        </p>
      </div>

      <HowItWorks
        id="client-create-request"
        title="Antes de publicar"
        steps={[
          {
            marker: "🎯",
            title: "Escolha a specialty certa",
            body: "Só trampistas com essa specialty vão receber sua vaga. Pra Aux. de cozinha + atendimento, publica uma vaga só com a função principal.",
          },
          {
            marker: "🔥",
            title: "Urgência muda o tom",
            body: "Baixa = pode esperar dias. Crítica = preciso agora. Trampistas filtram por urgência; ser honesto traz match certo.",
          },
          {
            marker: "💰",
            title: "Valor proposto (opcional)",
            body: "Se você sugere um valor, trampistas decidem mais rápido. Lembra: 10% é descontado do que você paga pra eles e fica como comissão da plataforma.",
          },
        ]}
        tip="Notificação chega no sininho do trampista assim que você publica."
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <Label htmlFor="title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                required
                placeholder="Ex: Auxiliar de cozinha pra hoje à noite"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">
                Descrição <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                required
                rows={4}
                placeholder="Conta o que precisa, quantas horas, o que esperar. Ex: 'Auxiliar pra prep e montagem de marmitas, das 18h às 23h.'"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="specialty">
                Especialidade <span className="text-destructive">*</span>
              </Label>
              <select
                id="specialty"
                required
                value={form.specialtyId}
                onChange={(e) => setForm({ ...form, specialtyId: e.target.value })}
                disabled={loadingSpecialties}
                className="mt-1.5 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione…</option>
                {(specialties ?? []).map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Urgência</Label>
              <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {URGENCIES.map((u) => {
                  const selected = form.urgencyLevel === u.value;
                  return (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setForm({ ...form, urgencyLevel: u.value })}
                      className={`text-left rounded-lg border-2 p-3 transition-all ${
                        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
                      } ${u.cls}`}
                    >
                      <p className="font-bold text-sm">{u.label}</p>
                      <p className="text-xs opacity-80">{u.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduledDate">Data desejada</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={form.scheduledDate}
                  onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="scheduledTime">Horário</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={form.scheduledTime}
                  onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duração estimada (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="0"
                  placeholder="240"
                  value={form.estimatedDurationMinutes}
                  onChange={(e) =>
                    setForm({ ...form, estimatedDurationMinutes: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="price">Valor proposto (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="120,00"
                  value={form.proposedPrice}
                  onChange={(e) => setForm({ ...form, proposedPrice: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <GeolocationField
              label="Local do trampo"
              helper="Onde o trampista precisa chegar. Trampistas próximos vão primeiro na fila."
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
            />

            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLocation("/client")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Publicando..." : "Publicar solicitação"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

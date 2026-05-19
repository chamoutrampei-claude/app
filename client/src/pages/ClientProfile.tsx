import GeolocationField from "@/components/GeolocationField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type FormState = {
  companyName: string;
  phone: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

const EMPTY: FormState = {
  companyName: "",
  phone: "",
  city: "",
  latitude: null,
  longitude: null,
};

const CITIES = ["Taubaté", "Pindamonhangaba", "Caçapava", "Tremembé", "Outra"];

export default function ClientProfile() {
  const { data: profile, isLoading } = trpc.clientService.getProfile.useQuery();
  const utils = trpc.useUtils();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!profile || hydrated) return;
    setForm({
      companyName: profile.companyName ?? "",
      phone: profile.phone ?? "",
      city: profile.city ?? "",
      latitude: profile.latitude ?? null,
      longitude: profile.longitude ?? null,
    });
    setHydrated(true);
  }, [profile, hydrated]);

  const updateProfile = trpc.clientService.updateProfile.useMutation({
    onSuccess: () => {
      utils.clientService.getProfile.invalidate();
      toast.success("Perfil salvo!");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      toast.error("Nome da empresa é obrigatório.");
      return;
    }
    updateProfile.mutate({
      companyName: form.companyName.trim(),
      phone: form.phone || undefined,
      city: form.city || undefined,
      latitude: form.latitude ?? undefined,
      longitude: form.longitude ?? undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">Perfil da empresa</h1>
        <p className="text-muted-foreground mt-1">
          Dados que os trampistas vão ver quando você publicar uma vaga.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <Label htmlFor="companyName">
                Nome da empresa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                required
                placeholder="Ex: Padaria Pão Quente"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">WhatsApp / Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(12) 9 9999-9999"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="city">Cidade</Label>
                <select
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1.5 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione…</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <GeolocationField
              label="Localização da empresa"
              helper="Trampistas perto da sua empresa têm prioridade nos matches."
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
            />

            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Salvando..." : "Salvar perfil"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

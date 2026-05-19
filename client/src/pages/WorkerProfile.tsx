import GeolocationField from "@/components/GeolocationField";
import HowItWorks from "@/components/HowItWorks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Copy, ExternalLink, FileText, Printer, Share2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type FormState = {
  photoUrl: string;
  bio: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  hourlyRate: string;
  specialties: number[];
  isActive: boolean;
  acceptsFreela: boolean;
  acceptsDiaria: boolean;
  acceptsFixa: boolean;
  professionArea: string;
};

const EMPTY: FormState = {
  photoUrl: "",
  bio: "",
  city: "",
  latitude: null,
  longitude: null,
  hourlyRate: "",
  specialties: [],
  isActive: true,
  acceptsFreela: true,
  acceptsDiaria: true,
  acceptsFixa: false,
  professionArea: "",
};

export default function WorkerProfile() {
  const { data: profile, isLoading: loadingProfile } = trpc.worker.getProfile.useQuery();
  const { data: specialties, isLoading: loadingSpecialties } = trpc.specialties.list.useQuery();
  const utils = trpc.useUtils();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const requestUpload = trpc.upload.requestPhotoUpload.useMutation();

  // Picks a local image and uploads it. Tries the real S3 path first (via the
  // server's presigned PUT URL); if Forge isn't configured (PRECONDITION_FAILED),
  // falls back to inlining as a data URL so dev mode still works.
  const MAX_PHOTO_BYTES = 5_000_000; // 5 MB
  const handleFilePick = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error(`Imagem muito grande (max 5 MB).`);
      return;
    }
    setUploading(true);
    try {
      // Real path: request presigned URL → upload directly to S3.
      const { uploadUrl, publicPath } = await requestUpload.mutateAsync({
        filename: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
      });
      const resp = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!resp.ok) throw new Error(`Upload retornou HTTP ${resp.status}`);
      setForm((prev) => ({ ...prev, photoUrl: publicPath }));
      toast.success("Foto enviada.");
    } catch (error: unknown) {
      // Fallback: data URL (dev mode without Forge / S3 config).
      const msg = error instanceof Error ? error.message : String(error);
      const isStorageNotConfigured = msg.includes("Upload S3 não configurado");
      if (file.size > 1_000_000 && !isStorageNotConfigured) {
        toast.error("Upload S3 falhou e a imagem é grande pra data URL. Tenta uma menor.");
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          if (typeof dataUrl === "string") {
            setForm((prev) => ({ ...prev, photoUrl: dataUrl }));
            if (isStorageNotConfigured) {
              toast.info("Foto salva localmente (S3 não configurado em dev).");
            } else {
              toast.warning("S3 falhou — usando preview local.");
            }
          }
        };
        reader.onerror = () => toast.error("Não consegui ler a imagem.");
        reader.readAsDataURL(file);
      }
    } finally {
      setUploading(false);
    }
  };

  // Hydrate the form once from the loaded profile.
  useEffect(() => {
    if (!profile || hydrated) return;
    setForm({
      photoUrl: profile.photoUrl ?? "",
      bio: profile.bio ?? "",
      city: profile.city ?? "",
      latitude: profile.latitude ?? null,
      longitude: profile.longitude ?? null,
      hourlyRate: profile.hourlyRate?.toString() ?? "",
      specialties: (profile.specialties ?? []) as number[],
      isActive: profile.isActive ?? true,
      acceptsFreela: profile.acceptsFreela ?? true,
      acceptsDiaria: profile.acceptsDiaria ?? true,
      acceptsFixa: profile.acceptsFixa ?? false,
      professionArea: profile.professionArea ?? "",
    });
    setHydrated(true);
  }, [profile, hydrated]);

  const updateProfile = trpc.worker.updateProfile.useMutation({
    onSuccess: () => {
      utils.worker.getProfile.invalidate();
      toast.success("Perfil salvo! Seu currículo está visível pros logistas.");
      // Flash the CV callout briefly so the trampista realizes their data
      // just became their public CV.
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3500);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.hourlyRate && Number.isNaN(Number(form.hourlyRate))) {
      toast.error("Tarifa horária inválida");
      return;
    }
    updateProfile.mutate({
      photoUrl: form.photoUrl || undefined,
      bio: form.bio || undefined,
      city: form.city || undefined,
      latitude: form.latitude ?? undefined,
      longitude: form.longitude ?? undefined,
      hourlyRate: form.hourlyRate || undefined,
      specialties: form.specialties,
      isActive: form.isActive,
      acceptsFreela: form.acceptsFreela,
      acceptsDiaria: form.acceptsDiaria,
      acceptsFixa: form.acceptsFixa,
      professionArea: form.acceptsFixa ? form.professionArea || undefined : undefined,
    });
  };

  const toggleSpecialty = (id: number) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(id)
        ? prev.specialties.filter((x) => x !== id)
        : [...prev.specialties, id],
    }));
  };

  if (loadingProfile) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">Meu perfil</h1>
        <p className="text-muted-foreground mt-1">
          Quanto mais completo, mais matches. É isso que os logistas vão ver.
        </p>
      </div>

      {profile && (
        <CurriculoCallout userId={profile.userId} flashing={justSaved} />
      )}

      <HowItWorks
        id="worker-profile"
        title="Como o perfil influencia os matches"
        steps={[
          {
            marker: "👤",
            title: "Bio + foto + tarifa",
            body: "Aparecem no card que o logista vê. Bio detalhada e foto profissional fecham mais trampos.",
          },
          {
            marker: "🛠️",
            title: "Especialidades",
            body: "Só aparece pra logista nas vagas que batem com pelo menos uma das suas specialties. Marca tudo que você faz bem.",
          },
          {
            marker: "⚡",
            title: "Modalidades (Freela / Diária / Fixa)",
            body: "Define onde você aparece. Vaga fixa coloca seu perfil na aba 'Disposição para Trabalho' como currículo.",
          },
          {
            marker: "🔘",
            title: "Disponível pra trampear",
            body: "Switch no topo. Quando desligado, você somente some das buscas — nada do seu histórico é apagado.",
          },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Active toggle */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-secondary">
              <div>
                <Label htmlFor="isActive" className="text-base font-semibold">
                  Disponível pra trampear
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Quando desligado, você não aparece nas buscas.
                </p>
              </div>
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>

            {/* Modalidades aceitas */}
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div>
                <p className="text-base font-semibold">Que tipo de trampo você aceita?</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Marca um ou mais. Aparece pra logista nos lugares certos.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 py-2 border-t">
                <div>
                  <Label htmlFor="acceptsFreela" className="font-semibold">Freela</Label>
                  <p className="text-xs text-muted-foreground">Urgência, imprevisto. Trampo pontual.</p>
                </div>
                <Switch
                  id="acceptsFreela"
                  checked={form.acceptsFreela}
                  onCheckedChange={(v) => setForm({ ...form, acceptsFreela: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-3 py-2 border-t">
                <div>
                  <Label htmlFor="acceptsDiaria" className="font-semibold">Diária</Label>
                  <p className="text-xs text-muted-foreground">Turno avulso, evento de fim de semana.</p>
                </div>
                <Switch
                  id="acceptsDiaria"
                  checked={form.acceptsDiaria}
                  onCheckedChange={(v) => setForm({ ...form, acceptsDiaria: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-3 py-2 border-t">
                <div>
                  <Label htmlFor="acceptsFixa" className="font-semibold inline-flex items-center gap-2">
                    Vaga fixa
                    <span className="inline-flex items-center bg-yellow text-brand-darkest text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full">NOVO</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Seu perfil entra na <strong>"Disposição para Trabalho"</strong> — encaminhamos seu CV pra empresas que estão contratando.
                  </p>
                </div>
                <Switch
                  id="acceptsFixa"
                  checked={form.acceptsFixa}
                  onCheckedChange={(v) => setForm({ ...form, acceptsFixa: v })}
                />
              </div>

              {form.acceptsFixa && (
                <div className="pt-3 border-t">
                  <Label htmlFor="professionArea">Área de atuação (vaga fixa)</Label>
                  <Input
                    id="professionArea"
                    placeholder="Ex: Cozinha, Atendimento, Padaria, Logística…"
                    value={form.professionArea}
                    onChange={(e) => setForm({ ...form, professionArea: e.target.value })}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Como a empresa te procura nessa aba. Não precisa ser específico — uma palavra ou duas.
                  </p>
                </div>
              )}
            </div>

            {/* Photo */}
            <div className="grid sm:grid-cols-[112px_1fr] gap-4 items-start">
              <div className="relative h-28 w-28 rounded-xl overflow-hidden bg-muted flex items-center justify-center text-muted-foreground text-xs">
                {form.photoUrl ? (
                  <>
                    <img
                      src={form.photoUrl}
                      alt="Pré-visualização"
                      className="h-full w-full object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, photoUrl: "" })}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 hover:bg-background shadow flex items-center justify-center"
                      aria-label="Remover foto"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  "Sem foto"
                )}
              </div>
              <div className="space-y-2">
                <Label>Foto de perfil</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFilePick(f);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Enviando..." : "Escolher do dispositivo"}
                  </Button>
                </div>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">ou colar URL</summary>
                  <Input
                    id="photoUrl"
                    type="url"
                    placeholder="https://..."
                    value={form.photoUrl.startsWith("data:") ? "" : form.photoUrl}
                    onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                    className="mt-2"
                  />
                </details>
                <p className="text-xs text-muted-foreground">
                  Max 1 MB. JPG ou PNG.
                </p>
              </div>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                placeholder="Conta um pouco da sua experiência. Onde trampou, o que faz bem, o que prefere."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="mt-1.5"
              />
            </div>

            {/* City + hourly rate */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  placeholder="Taubaté"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="hourlyRate">Tarifa horária (R$)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="35,00"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <GeolocationField
              label="Sua localização"
              helper="A IA usa pra rankear trampos por distância. Mais perto, mais alto no match."
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
            />

            {/* Specialties */}
            <div>
              <Label>Especialidades</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Escolha tudo que você faz bem. Aparece em buscas por essas áreas.
              </p>
              {loadingSpecialties ? (
                <Skeleton className="h-20" />
              ) : (specialties ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Catálogo de especialidades não carregou. Conecta o banco e atualiza.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {specialties!.map((sp) => {
                    const selected = form.specialties.includes(sp.id);
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => toggleSpecialty(sp.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        {sp.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {form.specialties.length > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  <Badge variant="secondary">{form.specialties.length}</Badge> especialidade(s) selecionada(s)
                </p>
              )}
            </div>

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

// Persistent callout that frames "your profile data = your public CV".
// `flashing` highlights the card briefly after a save to reinforce the link.
function CurriculoCallout({
  userId,
  flashing,
}: {
  userId: number;
  flashing: boolean;
}) {
  const path = `/trampista/${userId}`;
  const fullUrl =
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copiado! Cola no Instagram/WhatsApp.");
    } catch {
      toast.error("Não consegui copiar. Tenta de novo.");
    }
  };

  const shareLink = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Meu currículo TRAMPEI", url: fullUrl });
        return;
      } catch {
        // user cancelled; fall through to copy
      }
    }
    copyLink();
  };

  return (
    <Card
      className={`border-2 transition-all ${
        flashing
          ? "border-yellow bg-yellow/15 shadow-card-hover ring-4 ring-yellow/30"
          : "border-brand-light/40 bg-brand-light/5"
      }`}
    >
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-brand text-cream flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-base">
              Seu currículo está vivo
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tudo que você preenche aqui vira um currículo público. Logistas
              veem essa página quando te encontram pela busca.
            </p>
          </div>
        </div>

        <div className="bg-background border rounded-md px-3 py-2 text-xs text-muted-foreground font-mono break-all">
          {fullUrl}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={path}>
            <Button type="button" size="sm">
              <ExternalLink className="h-4 w-4" /> Ver currículo
            </Button>
          </Link>
          <Button type="button" size="sm" variant="outline" onClick={shareLink}>
            <Share2 className="h-4 w-4" /> Compartilhar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => window.open(`${path}?print=1`, "_blank")}
          >
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={copyLink}>
            <Copy className="h-4 w-4" /> Copiar link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

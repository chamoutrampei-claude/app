import HowItWorks from "@/components/HowItWorks";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Briefcase, ExternalLink, MapPin, Star, Zap } from "lucide-react";
import { Link } from "wouter";
import { useMemo, useState } from "react";

const RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Qualquer" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" },
  { value: 4.5, label: "4.5+" },
];

type Mode = "gig" | "fixa";

export default function SearchWorkers() {
  const [mode, setMode] = useState<Mode>("gig");
  const [specialtyId, setSpecialtyId] = useState<string>("");
  const [city, setCity] = useState("");
  const [minRating, setMinRating] = useState(0);

  const { data: specialties } = trpc.specialties.list.useQuery();
  // Pull client's lat/lng from their profile so the server can rank by
  // proximity. Falls back to rating-only when the client hasn't set location.
  const { data: clientProfile } = trpc.clientService.getProfile.useQuery();
  const { data: workers, isLoading } = trpc.worker.search.useQuery({
    mode,
    specialtyId: specialtyId ? Number(specialtyId) : undefined,
    city: city || undefined,
    minRating: minRating > 0 ? minRating : undefined,
    fromLat: clientProfile?.latitude ?? undefined,
    fromLng: clientProfile?.longitude ?? undefined,
  });

  const specialtyById = useMemo(() => {
    const m = new Map<number, string>();
    (specialties ?? []).forEach((s) => m.set(s.id, s.name));
    return m;
  }, [specialties]);

  const clearFilters = () => {
    setSpecialtyId("");
    setCity("");
    setMinRating(0);
  };

  const hasFilters = specialtyId !== "" || city !== "" || minRating > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">
          {mode === "fixa" ? "Disposição para Trabalho" : "Buscar trampistas"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {mode === "fixa"
            ? "Trampistas que deixaram o perfil como currículo, abertos a vaga fixa."
            : "Profissionais disponíveis pra freela e diárias na sua região."}
        </p>
      </div>

      <HowItWorks
        id="client-search"
        title="Duas abas, duas formas de contratar"
        subtitle="Cá embaixo você troca entre o jeito sob demanda e o jeito de vaga fixa."
        steps={[
          {
            marker: "⚡",
            title: "Freela / Diária",
            body: "Trampistas disponíveis pra trampo pontual ou turno avulso. Pra contratar, volte em Nova Solicitação e publique — quem dos resultados aqui aceitar, fica seu.",
          },
          {
            marker: "💼",
            title: "Vaga fixa (Disposição para Trabalho)",
            body: "Trampistas que deixaram o currículo público porque querem contratação fixa. Use o campo Área de atuação pra filtrar quem você quer entrevistar.",
          },
          {
            title: "Filtros",
            body: "Especialidade, cidade (busca parcial: 'pind' acha 'Pindamonhangaba'), e reputação mínima. Resultados sempre vêm ordenados por reputação maior.",
          },
        ]}
      />

      {/* Mode tabs */}
      <div className="inline-flex rounded-xl bg-secondary p-1 gap-1">
        <button
          onClick={() => setMode("gig")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mode === "gig"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-4 w-4" />
          Freela / Diária
        </button>
        <button
          onClick={() => setMode("fixa")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mode === "fixa"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Vaga fixa
          <span className="inline-flex items-center bg-yellow text-brand-darkest text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full">
            NOVO
          </span>
        </button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="specialty">Especialidade</Label>
              <select
                id="specialty"
                value={specialtyId}
                onChange={(e) => setSpecialtyId(e.target.value)}
                className="mt-1.5 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Todas</option>
                {(specialties ?? []).map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                placeholder="Ex: Taubaté"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Reputação mínima</Label>
              <div className="mt-1.5 flex gap-1.5">
                {RATING_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setMinRating(r.value)}
                    className={`flex-1 px-2 h-9 rounded-md text-xs font-semibold border transition-colors ${
                      minRating === r.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={clearFilters}
                disabled={!hasFilters}
                className="w-full"
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Buscando…"
            : `${(workers ?? []).length} ${mode === "fixa" ? "currículo(s)" : "trampista(s)"} encontrado(s)`}
        </p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : (workers ?? []).length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center space-y-2">
            <p className="font-display font-bold text-lg">
              {mode === "fixa" ? "Nenhum currículo nesses filtros" : "Sem trampistas nesses filtros"}
            </p>
            <p className="text-sm text-muted-foreground">Tenta ampliar os critérios ou limpar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(workers ?? []).map((w) => {
            const initials = (w.userName ?? "?")
              .split(" ")
              .map((s) => s[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();
            const specs = (w.specialties ?? []) as number[];
            return (
              <Card key={w.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardContent className="pt-6 flex flex-col flex-1">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border">
                      {w.photoUrl && (
                        <img
                          src={w.photoUrl}
                          alt={w.userName ?? "Trampista"}
                          className="h-full w-full object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-brand text-cream font-bold">
                        {initials || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold truncate">
                        {w.userName ?? "Trampista"}
                      </p>
                      {mode === "fixa" && w.professionArea && (
                        <p className="text-xs text-brand font-semibold mt-0.5">
                          {w.professionArea}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {w.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {w.city}
                          </span>
                        )}
                        {w.distanceKm != null && (
                          <span className="inline-flex items-center gap-1 text-brand font-semibold">
                            {w.distanceKm < 1
                              ? `${Math.round(w.distanceKm * 1000)} m`
                              : `${w.distanceKm.toFixed(1)} km`}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-0.5 text-foreground font-semibold">
                          <Star className="h-3 w-3 fill-yellow text-yellow" />
                          {(w.rating ?? 0).toFixed(1)}
                          <span className="text-muted-foreground font-normal">
                            ({w.totalReviews ?? 0})
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  {w.bio && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1">
                      {w.bio}
                    </p>
                  )}
                  {specs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {specs.slice(0, 4).map((id) => (
                        <Badge key={id} variant="secondary" className="text-[10px]">
                          {specialtyById.get(id) ?? `Especialidade ${id}`}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t">
                    {w.hourlyRate ? (
                      <span className="text-sm">
                        <span className="font-display font-bold tabular-nums">R$ {w.hourlyRate}</span>
                        <span className="text-muted-foreground text-xs">/h</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sem tarifa</span>
                    )}
                    {w.isActive ? (
                      <Badge className="bg-brand-light/20 text-brand">Disponível</Badge>
                    ) : (
                      <Badge variant="secondary">Off</Badge>
                    )}
                  </div>
                  <Link
                    href={`/trampista/${w.userId}`}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark hover:underline"
                  >
                    Ver currículo <ExternalLink className="h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

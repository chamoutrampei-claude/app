import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  MapPin,
  Printer,
  Quote,
  Share2,
  Star,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

function timeAgo(date: Date | string) {
  const d = +new Date(date);
  const diff = Date.now() - d;
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "hoje";
  if (days < 7) return `${days}d atrás`;
  if (days < 30) return `${Math.floor(days / 7)}sem atrás`;
  if (days < 365) return `${Math.floor(days / 30)}mês atrás`;
  return `${Math.floor(days / 365)}a atrás`;
}

// Public, no-auth profile page for sharing a trampista's reputation. Use case:
// trampista posts the link on Instagram / WhatsApp to attract logistas. Logista
// clicks → sees the work, ratings, reviews → signs up to contract.
export default function PublicWorkerProfile() {
  // Page is mounted under both /trampista/:userId and /curriculo/:userId.
  // Try both — whichever matches gives us the userId param.
  const [matchT, paramsT] = useRoute("/trampista/:userId");
  const [matchC, paramsC] = useRoute("/curriculo/:userId");
  const match = matchT || matchC;
  const userIdParam = paramsT?.userId ?? paramsC?.userId;
  const userId = userIdParam ? Number(userIdParam) : NaN;

  const { data: profile, isLoading } = trpc.worker.publicProfile.useQuery(
    { userId },
    { enabled: !Number.isNaN(userId) },
  );
  const { data: specialties } = trpc.specialties.list.useQuery();

  const specialtyName = (id: number) =>
    specialties?.find((s) => s.id === id)?.name ?? `#${id}`;

  const [shareSupported, setShareSupported] = useState(false);
  useEffect(() => {
    setShareSupported(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  // When opened with ?print=1 (from the "Imprimir/PDF" button on the worker's
  // own profile), wait for data to load then fire the browser print dialog.
  useEffect(() => {
    if (!profile) return;
    if (typeof window === "undefined") return;
    const hasPrint = new URLSearchParams(window.location.search).has("print");
    if (!hasPrint) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [profile]);

  const share = async () => {
    const url = window.location.href;
    const text = `${profile?.userName ?? "Trampista"} na TRAMPEI — ${profile?.rating?.toFixed(1) ?? "—"}★`;
    if (shareSupported) {
      try {
        await navigator.share({ title: "TRAMPEI", text, url });
        return;
      } catch {
        // user cancelled, fall through
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não consegui copiar o link.");
    }
  };

  if (!match || Number.isNaN(userId)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-off print:bg-white">
      {/* Print-friendly styles applied via Tailwind print: variant. The header,
          footer, and share buttons hide in print so the page becomes a clean
          one-page currículo when somebody hits Ctrl+P. */}
      <header className="bg-brand-darkest text-cream print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="TRAMPEI" className="h-9 w-9 rounded-md object-cover" />
            <span className="font-display font-extrabold text-lg tracking-tight">
              TRAMPEI
            </span>
          </Link>
          <Button
            size="sm"
            onClick={() => (window.location.href = "/login")}
            className="bg-yellow text-brand-darkest hover:bg-yellow-soft font-semibold"
          >
            Entrar
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {isLoading ? (
          <>
            <Skeleton className="h-40" />
            <Skeleton className="h-60" />
          </>
        ) : !profile ? (
          <Card>
            <CardContent className="pt-10 pb-10 text-center space-y-3">
              <p className="font-display font-bold text-lg">Trampista não encontrado</p>
              <p className="text-sm text-muted-foreground">
                O perfil pode ter sido removido ou o link está incorreto.
              </p>
              <Link
                href="/"
                className="inline-flex items-center text-sm text-brand font-semibold hover:underline"
              >
                Voltar pra TRAMPEI
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Hero */}
            <Card className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 flex-wrap">
                  <Avatar className="h-20 w-20 border-2 border-brand-light/40">
                    {profile.photoUrl && (
                      <img
                        src={profile.photoUrl}
                        alt={profile.userName ?? "Trampista"}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-brand text-cream font-display font-extrabold text-xl">
                      {profile.userName?.[0]?.toUpperCase() ?? "T"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-[200px]">
                    <h1 className="font-display font-extrabold text-2xl">
                      {profile.userName ?? "Trampista"}
                    </h1>
                    {profile.professionArea && (
                      <p className="text-sm text-brand font-semibold mt-0.5">
                        {profile.professionArea}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                      <span className="inline-flex items-center gap-1 text-foreground font-bold">
                        <Star className="h-4 w-4 fill-yellow text-yellow" />
                        {profile.rating.toFixed(1)}
                        <span className="text-muted-foreground font-normal">
                          ({profile.totalReviews})
                        </span>
                      </span>
                      {profile.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {profile.city}
                        </span>
                      )}
                      {profile.isActive ? (
                        <Badge className="bg-brand-light/20 text-brand">Disponível</Badge>
                      ) : (
                        <Badge variant="secondary">Off no momento</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 print:hidden">
                    <Button
                      onClick={share}
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      <Share2 className="h-4 w-4" /> Compartilhar
                    </Button>
                    <Button
                      onClick={() => window.print()}
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                    >
                      <Printer className="h-4 w-4" /> Imprimir / PDF
                    </Button>
                  </div>
                </div>

                {profile.bio && (
                  <p className="mt-5 text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {profile.bio}
                  </p>
                )}

                {/* CV stats — what a logista really wants to know at a glance. */}
                <div className="mt-5 grid grid-cols-3 gap-3 pt-5 border-t">
                  <div className="text-center">
                    <p className="font-display font-extrabold text-2xl tabular-nums text-brand-darkest">
                      {profile.completedJobs}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1 leading-tight">
                      Trampos<br />concluídos
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-display font-extrabold text-2xl tabular-nums text-brand-darkest">
                      {profile.totalReviews}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1 leading-tight">
                      Avaliações<br />recebidas
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-display font-extrabold text-2xl tabular-nums text-brand-darkest">
                      {new Date(profile.memberSince).toLocaleDateString("pt-BR", {
                        month: "short",
                        year: "2-digit",
                      })}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-1 leading-tight">
                      Na Trampei<br />desde
                    </p>
                  </div>
                </div>

                {/* Modalidades */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {profile.acceptsFreela && (
                    <Badge variant="secondary" className="bg-yellow/20 text-yellow-warm">
                      <Zap className="h-3 w-3" /> Freela
                    </Badge>
                  )}
                  {profile.acceptsDiaria && (
                    <Badge variant="secondary" className="bg-brand-light/20 text-brand">
                      <Clock className="h-3 w-3" /> Diária
                    </Badge>
                  )}
                  {profile.acceptsFixa && (
                    <Badge variant="secondary" className="bg-brand text-cream">
                      <Briefcase className="h-3 w-3" /> Vaga fixa
                    </Badge>
                  )}
                </div>

                {/* Specialties */}
                {profile.specialties.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Especialidades
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.specialties.map((id) => (
                        <Badge key={id} variant="outline" className="text-xs">
                          {specialtyName(id)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hourly rate */}
                {profile.hourlyRate && (
                  <div className="mt-5 pt-4 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tarifa de freela</span>
                    <span className="font-display font-extrabold text-2xl tabular-nums">
                      R$ {profile.hourlyRate}
                      <span className="text-sm text-muted-foreground font-normal">/h</span>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent reviews */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-lg">Últimas avaliações</h2>
                  <span className="text-xs text-muted-foreground">
                    {profile.totalReviews} no total
                  </span>
                </div>
                {profile.recentReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Ainda sem avaliações públicas.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {profile.recentReviews.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                        <Quote className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-yellow text-sm">
                              {"★".repeat(r.rating)}
                              <span className="text-muted-foreground">
                                {"★".repeat(5 - r.rating)}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {timeAgo(r.createdAt)}
                            </span>
                          </div>
                          {r.comment && (
                            <p className="text-sm mt-1.5 leading-relaxed">{r.comment}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* CTA — hides in print so the printed CV stays neutral. */}
            <Card className="bg-brand-darkest text-cream print:hidden">
              <CardContent className="pt-6 text-center space-y-3">
                <p className="font-display font-bold text-lg">
                  Quer contratar {profile.userName?.split(" ")[0] ?? "esse trampista"}?
                </p>
                <p className="text-sm text-cream/80">
                  Crie sua conta de logista na TRAMPEI e publique uma vaga.
                </p>
                <Button
                  onClick={() => (window.location.href = "/login")}
                  className="bg-yellow text-brand-darkest hover:bg-yellow-soft font-semibold"
                >
                  Entrar como logista
                </Button>
              </CardContent>
            </Card>

            {/* Print-only footer with TRAMPEI watermark. */}
            <div className="hidden print:block text-center text-xs text-muted-foreground pt-6 border-t mt-6">
              Currículo gerado em {new Date().toLocaleDateString("pt-BR")} pela
              plataforma TRAMPEI — Trabalho rápido. Gente pronta.
            </div>
          </>
        )}
      </main>

      <footer className="border-t bg-brand-darkest text-cream/60 mt-12 print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-xs">
          TRAMPEI · Trabalho rápido. Gente pronta.
        </div>
      </footer>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { ArrowRight, Briefcase, HardHat, Shield, ShieldCheck, Star, UserPlus, Zap } from "lucide-react";
import { Link } from "wouter";

const COOKIE = "dev-user-role";

function setDevRole(role: "user" | "worker" | "client" | "admin") {
  document.cookie = `${COOKIE}=${role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  window.location.href = "/";
}

const TRUST_POINTS = [
  { icon: Zap, label: "Match em minutos" },
  { icon: Star, label: "Avaliação dos dois lados" },
  { icon: Shield, label: "Dados protegidos" },
];

export default function Login() {
  const goToOAuth = () => {
    window.location.href = getLoginUrl();
  };

  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-brand-darkest text-cream">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="TRAMPEI" className="h-10 w-10 rounded-md object-cover" />
            <span className="font-display font-extrabold text-xl tracking-tight">
              TRAMPEI
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-cream/70 hover:text-cream transition-colors"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-5xl w-full mx-auto px-4 py-12 grid lg:grid-cols-12 gap-10 items-center">
          {/* Left — pitch */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-brand font-bold mb-2">
                Entrar na TRAMPEI
              </p>
              <h1 className="font-display font-extrabold text-3xl md:text-4xl leading-tight">
                Trabalho rápido.<br />
                Gente pronta.
              </h1>
              <p className="mt-3 text-muted-foreground max-w-md">
                Plataforma do Vale do Paraíba que conecta logistas a trampistas
                em minutos. Entre com a sua conta Manus pra acessar o painel.
              </p>
            </div>

            <ul className="space-y-2.5">
              {TRUST_POINTS.map((p) => (
                <li key={p.label} className="flex items-center gap-3 text-sm">
                  <p.icon className="h-4 w-4 text-brand" />
                  <span className="text-foreground">{p.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — actions */}
          <div className="lg:col-span-6 space-y-4">
            <Card className="border-2 border-brand-light/40 shadow-lg">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h2 className="font-display font-bold text-xl">
                    Continuar com Manus OAuth
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    A TRAMPEI usa a identidade Manus pra login seguro. Sem senha
                    pra decorar.
                  </p>
                </div>

                <Button
                  onClick={goToOAuth}
                  className="w-full bg-brand text-cream hover:bg-brand-dark font-semibold py-6 text-base"
                >
                  <ShieldCheck className="h-5 w-5" />
                  Entrar com Manus
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Primeira vez? A mesma porta serve pra criar conta.
                </p>
              </CardContent>
            </Card>

            <div className="bg-secondary/50 rounded-lg p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1.5">Depois de entrar</p>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Escolha seu perfil: <strong>logista</strong> ou <strong>trampista</strong></li>
                <li>Complete seu cadastro (1 min)</li>
                <li>Comece a contratar ou receber trampos</li>
              </ol>
            </div>

            {/* Dev shortcuts — visible only when running locally */}
            {isDev && (
              <Card className="border-2 border-yellow/40 bg-yellow/10">
                <CardContent className="pt-5 pb-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center bg-yellow text-brand-darkest text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full">
                      DEV
                    </span>
                    <p className="text-sm font-semibold">Atalhos de desenvolvimento</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sem OAuth nem banco. Escolha um role pra entrar como usuário
                    de teste.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <DevButton
                      icon={UserPlus}
                      label="Novo (onboarding)"
                      onClick={() => setDevRole("user")}
                    />
                    <DevButton
                      icon={HardHat}
                      label="Trampista"
                      onClick={() => setDevRole("worker")}
                    />
                    <DevButton
                      icon={Briefcase}
                      label="Logista"
                      onClick={() => setDevRole("client")}
                    />
                    <DevButton
                      icon={ShieldCheck}
                      label="Admin"
                      onClick={() => setDevRole("admin")}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Esses atalhos somem em produção (tree-shaken pelo Vite).
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t bg-brand-darkest text-cream/60">
        <div className="max-w-5xl mx-auto px-4 py-5 text-center text-xs">
          TRAMPEI · Trabalho rápido. Gente pronta. Vale do Paraíba — SP.
        </div>
      </footer>
    </div>
  );
}

type DevButtonProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
};

function DevButton({ icon: Icon, label, onClick }: DevButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border border-border hover:border-brand hover:bg-brand-light/10 transition-colors text-sm font-medium text-left"
    >
      <Icon className="h-4 w-4 text-brand shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

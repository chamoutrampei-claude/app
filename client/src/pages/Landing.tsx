import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, Sparkles, Star, Users, Zap } from "lucide-react";
import { useLocation } from "wouter";

const FEATURES = [
  {
    icon: Zap,
    title: "Match em minutos",
    body: "Pediu? Recebeu candidato em menos de 5 minutos durante o horário comercial.",
  },
  {
    icon: Users,
    title: "Gente pronta perto de você",
    body: "Mais de 31 mil trabalhadores no Vale do Paraíba prontos pra começar agora.",
  },
  {
    icon: Star,
    title: "Avaliação dos dois lados",
    body: "Logista avalia trabalhador. Trabalhador avalia logista. Reputação que importa.",
  },
  {
    icon: Sparkles,
    title: "IA escolhe o melhor",
    body: "Algoritmo combina especialidade, distância, histórico e disponibilidade — você só aprova.",
  },
  {
    icon: Clock,
    title: "24/7",
    body: "Funcionário sumiu no domingo de manhã? A gente também tá acordado.",
  },
  {
    icon: MapPin,
    title: "Pra quem é daqui",
    body: "Feito pro Vale: Taubaté, Pindamonhangaba, Caçapava, São José, e crescendo.",
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const goToLogin = () => setLocation("/login");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-brand-darkest text-cream">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Trampei" className="h-10 w-10 rounded-md" />
            <span className="text-xl font-display font-bold tracking-tight">TRAMPEI</span>
          </div>
          <Button
            variant="ghost"
            onClick={goToLogin}
            className="text-cream hover:text-yellow hover:bg-brand-dark"
          >
            Entrar
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-brand-darkest text-cream">
          <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
            <p className="text-yellow font-semibold tracking-widest text-sm mb-4">
              CHAMOU, TRAMPEI.
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.05]">
              Funcionário sumiu?<br />
              <span className="text-yellow">Chamou, trampei.</span>
            </h1>
            <p className="text-lg md:text-xl text-cream/80 max-w-2xl mx-auto mb-10">
              Plataforma de trabalho rápido no Vale do Paraíba. Logistas conectados
              a trabalhadores prontos pra começar agora. Match em minutos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={goToLogin}
                className="bg-yellow text-brand-darkest hover:bg-yellow-soft font-semibold"
              >
                Começar agora
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={goToLogin}
                className="border-cream text-cream hover:bg-brand-dark hover:text-cream"
              >
                Já tenho conta
              </Button>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
              Trabalho rápido. Gente pronta.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Tudo que o seu negócio precisa pra cobrir uma falta na hora ou contratar
              alguém pra um turno avulso.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border-border/60 hover:-translate-y-1 transition-transform">
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-5 w-5 text-brand" />
                  </div>
                  <h3 className="font-display font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-brand text-cream">
          <div className="max-w-6xl mx-auto px-4 py-16 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Bora trampar?
            </h2>
            <p className="text-cream/80 max-w-xl mx-auto mb-8">
              Crie sua conta grátis. Em menos de 2 minutos você já tá pedindo o
              primeiro match — ou recebendo a primeira solicitação.
            </p>
            <Button
              size="lg"
              onClick={goToLogin}
              className="bg-yellow text-brand-darkest hover:bg-yellow-soft font-semibold"
            >
              Entrar agora
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-brand-darkest text-cream/60 border-t border-brand-dark">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          <span>TRAMPEI — Trabalho rápido. Gente pronta. · Vale do Paraíba — SP</span>
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-cream transition-colors">
              Termos de uso
            </a>
            <a href="/privacy" className="hover:text-cream transition-colors">
              Privacidade
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

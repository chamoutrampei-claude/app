import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Briefcase, HardHat } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Role = "worker" | "client";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<Role | null>(null);
  const utils = trpc.useUtils();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });

  // If the user already chose a role, skip onboarding.
  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "worker") setLocation("/worker");
    else if (user.role !== "user") setLocation("/client");
  }, [loading, user, setLocation]);

  const setRole = trpc.auth.setRole.useMutation({
    onSuccess: (updated) => {
      // Update auth.me cache directly so AppLayout sees the new role on the
      // next render and doesn't bounce the user back to /onboarding.
      utils.auth.me.setData(undefined, updated);
      // Dev mode: persist the chosen role to the dev cookie so reloads keep
      // the user signed in as that role (no real DB or OAuth involved).
      if (import.meta.env.DEV) {
        document.cookie = `dev-user-role=${updated.role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }
      toast.success("Bem-vindo!");
      setLocation(updated.role === "worker" ? "/worker" : "/client");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleContinue = () => {
    if (!selected) return;
    setRole.mutate({ role: selected });
  };

  if (loading || !user) return <DashboardLayoutSkeleton />;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <img src="/logo.png" alt="Trampei" className="h-16 w-16 rounded-lg mx-auto mb-6" />
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Como você vai usar a Trampei?
          </h1>
          <p className="text-muted-foreground">
            Escolha um perfil pra começar. Você completa seus dados depois.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <RoleCard
            selected={selected === "worker"}
            onSelect={() => setSelected("worker")}
            icon={HardHat}
            title="Sou trabalhador"
            description="Oferecer serviços e receber solicitações de clientes na minha região."
          />
          <RoleCard
            selected={selected === "client"}
            onSelect={() => setSelected("client")}
            icon={Briefcase}
            title="Sou logista"
            description="Contratar trabalhadores sob demanda pra cobrir faltas e turnos extras."
          />
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            disabled={!selected || setRole.isPending}
            onClick={handleContinue}
          >
            {setRole.isPending ? "Salvando..." : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

type RoleCardProps = {
  selected: boolean;
  onSelect: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

function RoleCard({ selected, onSelect, icon: Icon, title, description }: RoleCardProps) {
  return (
    <Card
      onClick={onSelect}
      className={`cursor-pointer transition-all ${
        selected ? "border-primary ring-2 ring-primary/20" : "hover:border-muted-foreground/30"
      }`}
    >
      <CardContent className="pt-6">
        <Icon className="h-10 w-10 mb-4 text-primary" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

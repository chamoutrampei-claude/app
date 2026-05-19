import { Briefcase, HardHat, LogOut, ShieldCheck, UserPlus, Zap } from "lucide-react";
import { useEffect, useState } from "react";

type Role = "user" | "worker" | "client" | "admin";

const COOKIE = "dev-user-role";

function readCookie(): Role | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)dev-user-role=([^;]*)/);
  if (!m) return null;
  const v = decodeURIComponent(m[1]) as Role;
  return v === "user" || v === "worker" || v === "client" || v === "admin" ? v : null;
}

function setCookie(role: Role | null) {
  if (role) {
    document.cookie = `${COOKIE}=${role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } else {
    document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

// Floating panel that only renders in dev mode. Lets you impersonate any role
// without going through OAuth so you can navigate the internal app locally.
export default function DevPanel() {
  const [open, setOpen] = useState(true);
  const [current, setCurrent] = useState<Role | null>(null);

  useEffect(() => {
    setCurrent(readCookie());
  }, []);

  if (!import.meta.env.DEV) return null;

  const apply = (role: Role | null) => {
    setCookie(role);
    // Reload from root so Home re-runs its role-based redirect.
    window.location.href = "/";
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-brand-darkest text-yellow shadow-card-hover flex items-center justify-center hover:scale-105 transition-transform"
        title="Abrir painel dev"
        aria-label="Abrir painel dev"
      >
        <Zap className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-brand-darkest text-cream rounded-2xl shadow-card-hover border border-brand-dark p-3 max-w-xs">
      <div className="flex items-center justify-between gap-3 px-1 mb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-yellow" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-yellow">
            Painel dev
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-cream/60 hover:text-cream text-xs"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>
      <p className="text-[10px] text-cream/60 px-1 mb-2 leading-snug">
        Sem OAuth nem DB local. Escolha um perfil pra navegar a app.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <DevButton
          icon={UserPlus}
          label="Novo"
          hint="onboarding"
          active={current === "user"}
          onClick={() => apply("user")}
        />
        <DevButton
          icon={HardHat}
          label="Trampista"
          hint="worker"
          active={current === "worker"}
          onClick={() => apply("worker")}
        />
        <DevButton
          icon={Briefcase}
          label="Logista"
          hint="client"
          active={current === "client"}
          onClick={() => apply("client")}
        />
        <DevButton
          icon={ShieldCheck}
          label="Admin"
          hint="admin"
          active={current === "admin"}
          onClick={() => apply("admin")}
        />
      </div>
      <button
        onClick={() => apply(null)}
        className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-cream/70 hover:text-cream py-1.5 rounded-lg hover:bg-white/5 transition-colors"
      >
        <LogOut className="h-3 w-3" /> Sair (sem perfil)
      </button>
    </div>
  );
}

type DevButtonProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
};

function DevButton({ icon: Icon, label, hint, active, onClick }: DevButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-semibold transition-all ${
        active
          ? "bg-yellow text-brand-darkest shadow-pill"
          : "bg-white/5 hover:bg-white/10 text-cream"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span className="text-[8px] opacity-60 font-normal">{hint}</span>
    </button>
  );
}

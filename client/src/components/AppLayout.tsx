import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, { type DashboardMenuItem } from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import NotificationBell from "@/components/NotificationBell";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Handshake,
  History,
  LayoutDashboard,
  Plus,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const WORKER_MENU: DashboardMenuItem[] = [
  { icon: LayoutDashboard, label: "Solicitações", path: "/worker" },
  { icon: User, label: "Meu perfil", path: "/worker/profile" },
  { icon: CalendarClock, label: "Disponibilidade", path: "/worker/availability" },
  { icon: Handshake, label: "Indicações", path: "/worker/referrals" },
  { icon: History, label: "Histórico", path: "/worker/history" },
];

const CLIENT_MENU: DashboardMenuItem[] = [
  { icon: LayoutDashboard, label: "Minhas solicitações", path: "/client" },
  { icon: Plus, label: "Nova solicitação", path: "/client/request/new" },
  { icon: Search, label: "Buscar profissionais", path: "/client/search" },
  { icon: History, label: "Histórico", path: "/client/history" },
  { icon: Building2, label: "Perfil da empresa", path: "/client/profile" },
];

const ADMIN_MENU: DashboardMenuItem[] = [
  { icon: ShieldCheck, label: "Painel admin", path: "/admin" },
  { icon: Handshake, label: "Indicações", path: "/admin/referrals" },
  { icon: AlertTriangle, label: "Disputas", path: "/admin/disputes" },
];

type Props = {
  children: React.ReactNode;
};

// Wraps authenticated pages with the role-aware sidebar. Redirects users
// without a chosen role to /onboarding.
export default function AppLayout({ children }: Props) {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (user && user.role === "user" && location !== "/onboarding") {
      setLocation("/onboarding");
    }
  }, [loading, user, location, setLocation]);

  if (loading) return <DashboardLayoutSkeleton />;

  const menuItems =
    user?.role === "worker"
      ? WORKER_MENU
      : user?.role === "admin"
        ? ADMIN_MENU
        : CLIENT_MENU;

  return (
    <DashboardLayout
      brandLabel="TRAMPEI"
      brandLogoSrc="/logo.png"
      menuItems={menuItems}
      headerRight={<NotificationBell />}
    >
      {children}
    </DashboardLayout>
  );
}

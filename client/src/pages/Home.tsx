import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import Landing from "@/pages/Landing";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "user") setLocation("/onboarding");
    else if (user.role === "worker") setLocation("/worker");
    else if (user.role === "admin") setLocation("/admin");
    else setLocation("/client");
  }, [loading, user, setLocation]);

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <Landing />;
  return <DashboardLayoutSkeleton />;
}

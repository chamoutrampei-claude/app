import { useAuth } from "@/_core/hooks/useAuth";
import HowItWorks from "@/components/HowItWorks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Download, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Brazilian-friendly date stamp for file names: 20260518-1457.
function fileStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}`;
}

export default function Account() {
  const { user, logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const utils = trpc.useUtils();

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await utils.auth.exportMyData.fetch();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trampei-meus-dados-${fileStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Download iniciado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao exportar dados.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">
          Minha conta
        </h1>
        <p className="text-muted-foreground mt-1">
          Configurações de conta, dados e privacidade.
        </p>
      </div>

      <HowItWorks
        id="account"
        title="Seus direitos sobre seus dados"
        subtitle="A LGPD garante. A TRAMPEI cumpre."
        steps={[
          {
            marker: "📥",
            title: "Exportar tudo",
            body: "Baixe um JSON com todo seu cadastro, solicitações, avaliações e notificações. Pode levar pra outro lugar.",
          },
          {
            marker: "🚫",
            title: "Excluir conta",
            body: "Disponível em breve. Por enquanto, abra uma disputa marcada como 'crítica' pedindo exclusão.",
          },
          {
            marker: "🔒",
            title: "O que a gente guarda",
            body: "Identidade Manus, perfis, histórico de trampos, avaliações, indicações. Sem senha (OAuth). Sem dado bancário direto.",
          },
        ]}
      />

      {user && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Identidade
            </p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Nome</p>
                <p className="font-semibold">{user.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">E-mail</p>
                <p className="font-semibold">{user.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Perfil</p>
                <p className="font-semibold capitalize">{user.role}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Conta criada em</p>
                <p className="font-semibold">
                  {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <p className="font-display font-bold text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-brand" />
              Exportar meus dados (LGPD)
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Baixa um arquivo JSON com todo seu histórico na TRAMPEI: perfil,
              solicitações, avaliações, indicações, disputas e notificações.
            </p>
          </div>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "Gerando arquivo..." : "Baixar JSON"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="pt-6 space-y-4">
          <div>
            <p className="font-display font-bold text-lg flex items-center gap-2 text-destructive">
              <ShieldCheck className="h-5 w-5" />
              Sair da conta
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Encerra sua sessão neste dispositivo. Você volta pra Landing.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => logout()}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

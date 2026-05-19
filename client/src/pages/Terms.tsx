import { Link } from "wouter";

// Stub de Termos de Uso — substituir antes do lançamento por texto validado
// por advogado. Documento atual cobre o essencial pra MVP do Vale do Paraíba.
export default function Terms() {
  return (
    <div className="min-h-screen bg-off">
      <header className="bg-brand-darkest text-cream">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="TRAMPEI" className="h-9 w-9 rounded-md object-cover" />
            <span className="font-display font-extrabold text-lg tracking-tight">TRAMPEI</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-cream/70 hover:text-cream transition-colors"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 prose prose-sm sm:prose-base">
        <h1 className="font-display font-extrabold text-3xl mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground">
          Versão preliminar — última atualização: 18 de maio de 2026
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="font-display font-bold text-xl">1. Quem somos</h2>
          <p>
            A TRAMPEI é uma plataforma online que intermedia o contato entre
            empresas (logistas) e profissionais autônomos (trampistas) para a
            prestação de serviços avulsos ou em regime de vaga fixa, com
            operação inicial no Vale do Paraíba — SP.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">2. Relação com os usuários</h2>
          <p>
            A TRAMPEI é uma <strong>intermediadora</strong>. Não emprega trampistas
            nem é parte do contrato celebrado entre logista e trampista. Não há
            vínculo trabalhista entre TRAMPEI e qualquer usuário.
          </p>
          <p>
            Cada usuário é responsável por suas obrigações legais, tributárias
            e profissionais conforme a legislação aplicável.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">3. Comissões e pagamentos</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              <strong>Mensalidade:</strong> paga pelo logista à TRAMPEI conforme
              o plano escolhido (Básico, Pro, Premiere).
            </li>
            <li>
              <strong>Comissão de 10%:</strong> descontada pelo logista do valor
              pago ao trampista em cada contratação. Repassada à TRAMPEI junto
              com a mensalidade.
            </li>
            <li>
              <strong>Comissão de indicação:</strong> trampista que indica e
              fecha um novo logista recebe a primeira mensalidade integralmente
              como comissão.
            </li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">4. Conduta esperada</h2>
          <p>O uso da plataforma exige:</p>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Informações de cadastro verdadeiras e atualizadas.</li>
            <li>Cumprimento dos acordos firmados via plataforma.</li>
            <li>Tratamento respeitoso entre logistas, trampistas e equipe.</li>
            <li>Não-utilização da plataforma pra fraude, atos ilegais ou discriminação.</li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">5. Cancelamento e disputas</h2>
          <p>
            Solicitações podem ser canceladas até o início da execução pelo
            cliente, e até a conclusão pelo trampista. Disputas podem ser
            abertas pela função "Reportar problema" presente em cada solicitação.
            A equipe TRAMPEI analisa e responde dentro de 72 horas úteis no MVP.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">6. Suspensão de conta</h2>
          <p>
            A TRAMPEI pode suspender ou encerrar contas em caso de violação
            destes termos, sem prejuízo de eventual indenização por danos
            comprovados.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">7. Mudanças nestes termos</h2>
          <p>
            A TRAMPEI pode atualizar estes termos a qualquer momento; usuários
            são notificados na plataforma quando houver mudanças relevantes.
            Continuar usando após a atualização constitui aceite.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">8. Foro</h2>
          <p>
            Fica eleito o foro da comarca de Taubaté — SP para dirimir
            quaisquer controvérsias, com renúncia a qualquer outro, por mais
            privilegiado que seja.
          </p>
        </section>

        <p className="mt-10 text-xs text-muted-foreground italic">
          Esse texto é um rascunho operacional. Antes do lançamento público,
          submeter à revisão jurídica.
        </p>
      </main>

      <footer className="border-t bg-brand-darkest text-cream/60">
        <div className="max-w-3xl mx-auto px-4 py-5 text-center text-xs">
          <Link href="/privacy" className="hover:text-cream transition-colors">
            Política de privacidade
          </Link>
          <span className="mx-3">·</span>
          TRAMPEI · Trabalho rápido. Gente pronta.
        </div>
      </footer>
    </div>
  );
}

import { Link } from "wouter";

// Stub de Política de Privacidade conforme LGPD. Substituir antes do lançamento
// por texto validado por DPO/advogado quando houver tratamento de dados sensíveis.
export default function Privacy() {
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
        <h1 className="font-display font-extrabold text-3xl mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">
          Versão preliminar — última atualização: 18 de maio de 2026
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="font-display font-bold text-xl">1. Quais dados coletamos</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              <strong>Identidade:</strong> nome, e-mail, identificador da Manus
              (openId), data de cadastro.
            </li>
            <li>
              <strong>Perfil profissional:</strong> bio, especialidades, foto,
              tarifa, modalidades aceitas, área de atuação.
            </li>
            <li>
              <strong>Localização:</strong> latitude/longitude que você fornece
              voluntariamente (com seu consentimento via navegador).
            </li>
            <li>
              <strong>Histórico de uso:</strong> solicitações criadas/aceitas,
              avaliações dadas e recebidas, indicações cadastradas, disputas
              abertas, notificações lidas.
            </li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">2. Pra que usamos</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Conectar logistas a trampistas (objetivo principal da plataforma).</li>
            <li>Calcular reputação agregada visível pra outros usuários.</li>
            <li>Notificar você sobre eventos relevantes na plataforma.</li>
            <li>Detectar abuso, fraude e disputas.</li>
            <li>Melhorar o produto com base em dados anonimizados.</li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">3. Com quem compartilhamos</h2>
          <p>
            Seu nome, foto, bio, especialidades, cidade e avaliações são
            visíveis pra outros usuários da plataforma — é assim que o match
            funciona. Em nenhum momento compartilhamos seu e-mail, telefone
            ou coordenadas exatas com outros usuários sem sua autorização
            explícita.
          </p>
          <p>
            Não vendemos seus dados pra terceiros. Provedores que processam
            dados em nome da TRAMPEI (hospedagem, e-mail transacional, etc.)
            estão vinculados por contratos de confidencialidade.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">4. Seus direitos (LGPD)</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong>Acesso:</strong> ver todos os seus dados via página "Minha conta".</li>
            <li><strong>Portabilidade:</strong> exportar tudo em JSON pela mesma página.</li>
            <li><strong>Correção:</strong> editar perfil a qualquer momento.</li>
            <li><strong>Eliminação:</strong> solicitar exclusão da conta (em breve botão direto; por enquanto via disputa marcada como crítica).</li>
            <li>
              <strong>Revogação de consentimento:</strong> remover localização,
              desativar perfil, ou deletar conta.
            </li>
          </ul>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">5. Cookies</h2>
          <p>
            Usamos cookies essenciais pra autenticação (sessão Manus OAuth).
            Não usamos cookies de marketing nem rastreamento de terceiros no
            MVP.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">6. Retenção</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Após
            exclusão, dados ficam por até 6 meses em backups antes de serem
            apagados em definitivo. Histórico de transações pode ser retido
            por prazo legal exigido (Receita Federal: 5 anos).
          </p>
        </section>

        <section className="mt-6 space-y-3">
          <h2 className="font-display font-bold text-xl">7. Contato</h2>
          <p>
            Encarregado de dados (DPO): <strong>contato@trampei.com.br</strong>
          </p>
        </section>

        <p className="mt-10 text-xs text-muted-foreground italic">
          Esse texto é um rascunho operacional. Antes do lançamento público,
          submeter à revisão DPO/jurídica.
        </p>
      </main>

      <footer className="border-t bg-brand-darkest text-cream/60">
        <div className="max-w-3xl mx-auto px-4 py-5 text-center text-xs">
          <Link href="/terms" className="hover:text-cream transition-colors">
            Termos de uso
          </Link>
          <span className="mx-3">·</span>
          TRAMPEI · Trabalho rápido. Gente pronta.
        </div>
      </footer>
    </div>
  );
}

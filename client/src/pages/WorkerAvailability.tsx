import HowItWorks from "@/components/HowItWorks";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Cloud, Moon, Sun, Sunrise } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

type TimeSlot = "morning" | "afternoon" | "evening" | "night";

const SLOTS: { value: TimeSlot; label: string; hours: string; icon: typeof Sun }[] = [
  { value: "morning", label: "Manhã", hours: "06h–12h", icon: Sunrise },
  { value: "afternoon", label: "Tarde", hours: "12h–18h", icon: Sun },
  { value: "evening", label: "Noite", hours: "18h–00h", icon: Cloud },
  { value: "night", label: "Madrugada", hours: "00h–06h", icon: Moon },
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nextNDays(n: number): Date[] {
  const out: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d);
  }
  return out;
}

export default function WorkerAvailability() {
  const days = useMemo(() => nextNDays(14), []);
  const { data: profile } = trpc.worker.getProfile.useQuery();
  const { data: slots, isLoading } = trpc.worker.listAvailability.useQuery({});
  const utils = trpc.useUtils();

  const setSlot = trpc.worker.setAvailability.useMutation({
    onSuccess: () => {
      utils.worker.listAvailability.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Build a quick lookup: "YYYY-MM-DD|timeSlot" → isAvailable
  const slotMap = useMemo(() => {
    const m = new Map<string, boolean>();
    (slots ?? []).forEach((s) => {
      if (s.timeSlot) m.set(`${dateKey(new Date(s.date))}|${s.timeSlot}`, !!s.isAvailable);
    });
    return m;
  }, [slots]);

  const isOn = (date: Date, slot: TimeSlot) => {
    return slotMap.get(`${dateKey(date)}|${slot}`) ?? false;
  };

  const toggle = (date: Date, slot: TimeSlot) => {
    setSlot.mutate({
      date: dateKey(date),
      timeSlot: slot,
      isAvailable: !isOn(date, slot),
    });
  };

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <p className="font-display font-bold text-lg">Complete seu perfil primeiro</p>
            <p className="text-sm text-muted-foreground">
              A disponibilidade depende de você ter um perfil de trampista.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">
          Disponibilidade
        </h1>
        <p className="text-muted-foreground mt-1">
          Marque os turnos que você consegue trampear nos próximos 14 dias. A IA
          prioriza você nas vagas dos seus horários disponíveis.
        </p>
      </div>

      <HowItWorks
        id="worker-availability"
        title="Por que marcar disponibilidade?"
        steps={[
          {
            marker: "⚡",
            title: "Mais matches",
            body: "Logista chama pra um turno noturno? Se você marcou 'Madrugada' nesse dia, o sistema te coloca no topo da lista.",
          },
          {
            marker: "✓",
            title: "É só clicar pra ligar/desligar",
            body: "Verde = disponível, cinza = indisponível. Não precisa salvar — cada clique já vai pro servidor.",
          },
          {
            marker: "📅",
            title: "Vê 14 dias pra frente",
            body: "Marque agora a próxima semana e a seguinte. Você pode editar a qualquer momento.",
          },
        ]}
        tip="Quem não marca nada conta como 'indisponível padrão'. Marcar pelo menos a próxima semana já te coloca na frente."
        variant="yellow"
      />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Turno
                    </th>
                    {days.map((d) => {
                      const isToday = dateKey(d) === dateKey(new Date());
                      return (
                        <th
                          key={dateKey(d)}
                          className={`p-2 text-center text-xs font-semibold ${
                            isToday ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          <div>{WEEKDAYS[d.getDay()]}</div>
                          <div className="text-base tabular-nums">{d.getDate()}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {SLOTS.map((s) => (
                    <tr key={s.value} className="border-t">
                      <td className="p-2 align-middle">
                        <div className="flex items-center gap-2">
                          <s.icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-semibold">{s.label}</p>
                            <p className="text-[10px] text-muted-foreground">{s.hours}</p>
                          </div>
                        </div>
                      </td>
                      {days.map((d) => {
                        const on = isOn(d, s.value);
                        return (
                          <td key={`${dateKey(d)}|${s.value}`} className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => toggle(d, s.value)}
                              disabled={setSlot.isPending}
                              className={`h-8 w-full rounded-md border text-xs font-bold transition-all ${
                                on
                                  ? "bg-brand-light/30 border-brand text-brand hover:bg-brand-light/40"
                                  : "bg-muted/40 border-border text-muted-foreground hover:border-primary/40"
                              } disabled:opacity-50`}
                              aria-label={`${s.label} ${dateKey(d)} ${on ? "disponível" : "indisponível"}`}
                            >
                              {on ? "✓" : "—"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-xs text-muted-foreground">
                <span className="inline-block h-3 w-3 rounded-sm bg-brand-light/30 border border-brand mr-1.5 align-middle" /> Disponível
                <span className="inline-block h-3 w-3 rounded-sm bg-muted/40 border border-border ml-4 mr-1.5 align-middle" /> Não disponível
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

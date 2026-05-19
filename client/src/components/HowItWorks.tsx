import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Lightbulb, X } from "lucide-react";
import { useEffect, useState } from "react";

type Step = {
  /** Big number / emoji shown on the left (optional). */
  marker?: string;
  title: string;
  body: string;
};

type Props = {
  /** Unique id per page. Used as localStorage key to remember dismissed state. */
  id: string;
  /** Short headline. e.g. "Como funciona o painel" */
  title: string;
  /** One-line subhead under the title (optional). */
  subtitle?: string;
  /** Numbered/iconified steps. */
  steps: Step[];
  /** Optional footer with one extra tip. */
  tip?: string;
  /** Color variant. "info" (default brand green), "yellow" (urgent/important). */
  variant?: "info" | "yellow";
};

/**
 * Persistent explainer card shown at the top of a feature page so any user
 * (logista, trampista, admin) understands the screen at a glance without
 * leaving it. Two states:
 *
 *   - Expanded: full title + steps + tip (default first visit).
 *   - Collapsed: thin one-line bar with "Como funciona" + chevron to reopen.
 *
 * Both states have an "X" to dismiss permanently for this browser. Reopens
 * when localStorage is cleared.
 */
export default function HowItWorks({
  id,
  title,
  subtitle,
  steps,
  tip,
  variant = "info",
}: Props) {
  const dismissKey = `hiw-${id}-dismissed`;
  const collapseKey = `hiw-${id}-collapsed`;

  const [dismissed, setDismissed] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // Read storage on mount. SSR-safe defaults already applied above.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(localStorage.getItem(dismissKey) === "1");
    setCollapsed(localStorage.getItem(collapseKey) === "1");
  }, [dismissKey, collapseKey]);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(dismissKey, "1");
    setDismissed(true);
  };

  const toggle = () => {
    const next = !collapsed;
    localStorage.setItem(collapseKey, next ? "1" : "0");
    setCollapsed(next);
  };

  const bgClass =
    variant === "yellow"
      ? "bg-yellow/10 border-yellow/40"
      : "bg-brand-light/10 border-brand-light/30";
  const accentClass =
    variant === "yellow" ? "text-yellow-warm" : "text-brand";

  return (
    <Card className={`${bgClass} border-2 relative overflow-hidden`}>
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-2 right-2 h-6 w-6 rounded-md hover:bg-background/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Fechar explicação permanentemente"
        title="Não mostrar de novo"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-start gap-3 px-5 py-4 text-left pr-10"
        aria-expanded={!collapsed}
      >
        <Lightbulb className={`h-5 w-5 shrink-0 mt-0.5 ${accentClass}`} />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-base leading-tight">{title}</p>
          {subtitle && !collapsed && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 pt-1">
          <ol className="space-y-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span
                  className={`shrink-0 h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    variant === "yellow"
                      ? "bg-yellow text-brand-darkest"
                      : "bg-brand text-cream"
                  }`}
                >
                  {s.marker ?? i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-muted-foreground leading-snug">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          {tip && (
            <p className="mt-4 text-xs text-muted-foreground italic border-t pt-3">
              💡 {tip}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

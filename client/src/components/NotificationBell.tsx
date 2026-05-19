import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { useLocation } from "wouter";

const TYPE_ICONS: Record<string, string> = {
  new_request_match: "⚡",
  request_accepted: "✅",
  request_in_progress: "🔧",
  request_completed: "🎉",
  request_cancelled_by_client: "❌",
  worker_dropped: "↩️",
  review_received: "⭐",
  referral_active: "🤝",
  referral_paid: "💰",
};

function timeAgo(date: Date | string): string {
  const ms = Date.now() - +new Date(date);
  const s = Math.floor(ms / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString("pt-BR");
}

// Bell icon with unread count badge. Polls every 30s while mounted so worker
// gets visual signal when a new match comes in without a manual refresh.
export default function NotificationBell() {
  const [, setLocation] = useLocation();

  const { data: count = 0 } = trpc.notification.countUnread.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: list = [], refetch: refetchList } = trpc.notification.listMine.useQuery(
    undefined,
    { enabled: false },
  );

  const utils = trpc.useUtils();

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => {
      utils.notification.listMine.invalidate();
      utils.notification.countUnread.invalidate();
    },
  });

  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => {
      utils.notification.listMine.invalidate();
      utils.notification.countUnread.invalidate();
    },
  });

  const onOpen = (open: boolean) => {
    if (open) refetchList();
  };

  const onItemClick = (notifId: number, linkPath: string | null) => {
    markRead.mutate({ notificationId: notifId });
    if (linkPath) setLocation(linkPath);
  };

  return (
    <DropdownMenu onOpenChange={onOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative h-9 w-9 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
          aria-label={`Notificações (${count} não lidas)`}
        >
          {count > 0 ? (
            <BellRing className="h-4 w-4 text-yellow-warm" />
          ) : (
            <Bell className="h-4 w-4 text-muted-foreground" />
          )}
          {count > 0 && (
            <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-4 text-[9px] font-bold text-brand-darkest bg-yellow rounded-full px-1 leading-none">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 max-h-[480px] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="font-display font-bold text-sm">Notificações</p>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="h-7 text-xs"
            >
              <CheckCheck className="h-3 w-3" /> Marcar todas
            </Button>
          )}
        </div>
        <div className="overflow-y-auto flex-1">
          {list.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              Nada por aqui ainda.
            </div>
          ) : (
            <ul className="divide-y">
              {list.map((n) => (
                <li
                  key={n.id}
                  onClick={() => onItemClick(n.id, n.linkPath)}
                  className={`px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors ${
                    !n.read ? "bg-yellow/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5">
                      {TYPE_ICONS[n.type] ?? "📬"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm leading-tight ${!n.read ? "font-bold" : "font-medium"}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                    </div>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-yellow shrink-0 mt-1.5" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

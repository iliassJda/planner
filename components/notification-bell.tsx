"use client";

import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getNotifications, markNotificationsRead, type Notification } from "@/action/supabase";
import { createClient } from "@/utils/supabase/client";
import { timeAgo } from "@/help_functions";

const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const AVAIL_LABELS: Record<string, string> = {
  not_available: "Not available",
  morning: "Morning",
  afternoon: "Afternoon",
  whole_day: "Whole day",
};

function formatChange(change: { field: string; from: string; to: string }) {
  if (change.field === "hours") {
    return `Hours: ${change.from}h → ${change.to}h`;
  }
  if (change.field === "comment") {
    return `Comment updated`;
  }
  const day = DAY_LABELS[change.field] ?? change.field;
  const from = AVAIL_LABELS[change.from] ?? change.from;
  const to = AVAIL_LABELS[change.to] ?? change.to;
  return `${day}: ${from} → ${to}`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    getNotifications()
      .then(setNotifications)
      .catch((e) => console.error("Could not load notifications:", e));
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;

    // We subscribe to notification_events, not notifications. Realtime enforces
    // RLS against the anon key that ships to the browser, so broadcasting the
    // notifications table itself would mean making employee emails and
    // availability changes publicly readable. notification_events carries only
    // an id and a timestamp; a DB trigger emits one row per new notification.
    // The signal tells us *that* something changed, then we refetch the actual
    // rows through getNotifications(), which is admin-guarded on the server.
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification_events" },
        () => {
          getNotifications()
            .then(setNotifications)
            .catch((e) => console.error("Could not refresh notifications:", e));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      await markNotificationsRead(unreadIds);
      setNotifications((prev) =>
        prev.map((n) => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n)),
      );
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} new` : "All read"}
            </span>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const name = n.email.split("@")[0].replace(/\./g, " ");
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 transition-colors",
                      !n.is_read && "bg-blue-50/50 dark:bg-blue-950/20",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          <span className="capitalize">{name}</span>
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            updated week {n.week_number}
                          </span>
                        </p>
                        <div className="mt-1.5 space-y-0.5">
                          {n.changes.map((change, i) => (
                            <p key={i} className="text-[11px] text-muted-foreground leading-tight">
                              {formatChange(change)}
                            </p>
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

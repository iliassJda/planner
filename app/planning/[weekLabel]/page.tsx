import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPlanningPageData } from "@/action/supabase";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { getWeekStartDate, getShiftWorkedHours, getShiftAbsenceHours } from "@/help_functions";
import Link from "next/link";
import { ChevronLeft, ChevronRight, LayoutDashboard, Home } from "lucide-react";
import type { Shift, Store } from "@/types";
import { cn } from "@/lib/utils";
import IcalSubscribeButton from "@/components/ical-subscribe-button";

// ── Store colours ─────────────────────────────────────────────────────────────
const STORE_COLOURS = [
  { keywords: ["galerie"], bg: "#fecdd3", text: "#881337" },
  { keywords: ["beurre"], bg: "#ddd6fe", text: "#3b0764" },
  { keywords: ["grand", "place"], bg: "#bbf7d0", text: "#14532d" },
  { keywords: ["atelier"], bg: "#fed7aa", text: "#7c2d12" },
  { keywords: ["mad", "madeleine"], bg: "#bfdbfe", text: "#1e3a8a" },
  { keywords: ["louise"], bg: "#bae6fd", text: "#0c4a6e" },
];

function storeColour(store: Store | undefined) {
  if (!store) return null;
  const name = store.name.toLowerCase();
  return STORE_COLOURS.find((c) => c.keywords.some((kw) => name.includes(kw))) ?? null;
}

function fmt(h: number) {
  if (h <= 0) return "";
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return mins > 0 ? `${whole}h${mins.toString().padStart(2, "0")}` : `${whole}h`;
}

const ABSENCE_LABEL: Record<string, string> = {
  sick: "Malade",
  vacation: "Vacances",
  recup: "Récup",
};

const ABSENCE_STYLE: Record<string, string> = {
  sick: "bg-rose-100 text-rose-700",
  vacation: "bg-blue-100 text-blue-700",
  recup: "bg-amber-100 text-amber-700",
};

const STORE_GROUP_ORDER = ["beurre", "grand", "mad", "atelier", "galerie"];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PlanningPage({ params }: { params: Promise<{ weekLabel: string }> }) {
  const [{ weekLabel }, session] = await Promise.all([params, auth()]);

  if (!session?.user) redirect("/login");

  const label = decodeURIComponent(weekLabel);
  const data = await getPlanningPageData(label);

  if (!data) notFound();

  const { week, weekDates, shifts, users, stores, prevWeek, nextWeek } = data;

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(getWeekStartDate(week.week_number, week.year), i),
  );

  const otherStore = stores.find((s) => s.name.toLowerCase().includes("other")) ?? null;

  const storeGroupPriority = (storeId: number | null | undefined): number => {
    if (!storeId) return STORE_GROUP_ORDER.length;
    const store = stores.find((s) => s.id === storeId);
    if (!store) return STORE_GROUP_ORDER.length;
    const name = store.name.toLowerCase();
    const idx = STORE_GROUP_ORDER.findIndex((kw) => name.includes(kw));
    return idx === -1 ? STORE_GROUP_ORDER.length : idx;
  };

  const fixUsers = users
    .filter((u) => u.role === "fix")
    .sort((a, b) => {
      const pa = storeGroupPriority(a.store_id);
      const pb = storeGroupPriority(b.store_id);
      if (pa !== pb) return pa - pb;
      return (a.nickname || a.first_name).localeCompare(b.nickname || b.first_name);
    });

  const studentUsers = users
    .filter((u) => u.role !== "fix")
    .sort((a, b) => (a.nickname || a.first_name).localeCompare(b.nickname || b.first_name));

  const allSorted = [...fixUsers, ...studentUsers];
  const currentUserEmail = session.user?.email;
  const currentUserIdx = allSorted.findIndex((u) => u.email === currentUserEmail);
  const sortedUsers =
    currentUserIdx > 0
      ? [allSorted[currentUserIdx], ...allSorted.filter((_, i) => i !== currentUserIdx)]
      : allSorted;

  function shiftFor(email: string, dateKey: string): Shift | undefined {
    return shifts.find((s) => s.email === email && s.shift_date === dateKey);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-3 w-3" />
              Neuhaus · Planning
            </Link>
            <h1 className="text-xl font-bold tracking-tight mt-0.5">{label}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(weekDays[0], "d MMM", { locale: fr })} –{" "}
              {format(weekDays[6], "d MMM yyyy", { locale: fr })}
            </p>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUserEmail && <IcalSubscribeButton email={currentUserEmail} />}
            <Link
              href={prevWeek ? `/planning/${encodeURIComponent(prevWeek.week_label)}` : "#"}
              aria-disabled={!prevWeek}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border bg-background transition-colors",
                prevWeek ? "hover:bg-muted" : "opacity-30 pointer-events-none",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{prevWeek?.week_label ?? "—"}</span>
            </Link>

            <Link
              href={nextWeek ? `/planning/${encodeURIComponent(nextWeek.week_label)}` : "#"}
              aria-disabled={!nextWeek}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border bg-background transition-colors",
                nextWeek ? "hover:bg-muted" : "opacity-30 pointer-events-none",
              )}
            >
              <span className="hidden sm:inline">{nextWeek?.week_label ?? "—"}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Schedule */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-3">
        {sortedUsers.length === 0 ? (
          <p className="text-center text-muted-foreground py-16 text-sm">
            No schedule available for this week yet.
          </p>
        ) : (
          sortedUsers.map((user) => {
            const displayName = user.nickname || user.first_name;
            const userShifts = shifts.filter(
              (s) => s.email === user.email && weekDates.includes(s.shift_date),
            );
            const totalHours = userShifts.reduce((sum, s) => sum + getShiftWorkedHours(s), 0);

            return (
              <div
                key={user.email}
                className={cn(
                  "rounded-xl border bg-card shadow-sm overflow-hidden",
                  user.role === "fix" && "border-l-4 border-l-purple-400",
                )}
              >
                {/* Employee header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt={displayName}
                        className="h-7 w-7 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-primary/10 border flex items-center justify-center text-[10px] font-bold text-primary">
                        {displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="font-semibold text-sm">{displayName}</span>
                  </div>
                  {totalHours > 0 && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {fmt(totalHours)} this week
                    </span>
                  )}
                </div>

                {/* Phones: one row per day that has something.
                    The seven-column grid below gives each cell ~43px, which
                    clipped every store name ("Galerie de la Reine" needs 79px),
                    and the store is half the point of this view. Empty days
                    carry no information here, so dropping them buys the width
                    to show the name in full. */}
                <div className="flex flex-col divide-y sm:hidden">
                  {weekDays.every((_, i) => !shiftFor(user.email, weekDates[i])) && (
                    <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                      No shifts this week
                    </p>
                  )}
                  {weekDays.map((day, i) => {
                    const dateKey = weekDates[i];
                    const shift = shiftFor(user.email, dateKey);
                    if (!shift) return null;

                    const store = shift.store_id
                      ? stores.find((s) => s.id === shift.store_id)
                      : undefined;
                    const colour = storeColour(store);
                    const storeName =
                      otherStore && shift.store_id === otherStore.id
                        ? shift.custom_store_name || store?.name
                        : store?.name;

                    return (
                      <div
                        key={dateKey}
                        className="flex items-center gap-3 px-3 py-2"
                        style={
                          colour && shift.store_id != null
                            ? { backgroundColor: colour.bg }
                            : undefined
                        }
                      >
                        <div className="w-11 shrink-0">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                            {format(day, "EEE", { locale: fr })}
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground">
                            {format(day, "d")}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1">
                          {shift.store_id != null && (
                            <>
                              <p
                                className="font-mono text-xs font-bold leading-tight"
                                style={colour ? { color: colour.text } : undefined}
                              >
                                {shift.start_time} – {shift.end_time}
                              </p>
                              {storeName && (
                                <p
                                  className="text-[11px] font-medium leading-tight"
                                  style={
                                    colour ? { color: colour.text } : { color: "#64748b" }
                                  }
                                >
                                  {storeName}
                                </p>
                              )}
                            </>
                          )}
                          {shift.absence_type && (
                            <span
                              className={cn(
                                "mt-0.5 inline-block rounded px-1 py-0.5 text-[9px] font-bold uppercase",
                                ABSENCE_STYLE[shift.absence_type],
                              )}
                            >
                              {ABSENCE_LABEL[shift.absence_type]}
                              {getShiftAbsenceHours(shift) > 0 &&
                                ` ${fmt(getShiftAbsenceHours(shift))}`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Days grid — sm and up, unchanged */}
                <div className="hidden grid-cols-7 divide-x text-center text-[11px] sm:grid">
                  {weekDays.map((day, i) => {
                    const dateKey = weekDates[i];
                    const shift = shiftFor(user.email, dateKey);
                    const store = shift?.store_id
                      ? stores.find((s) => s.id === shift.store_id)
                      : undefined;
                    const colour = storeColour(store);
                    const storeName =
                      otherStore && shift?.store_id === otherStore.id
                        ? shift.custom_store_name || store?.name
                        : store?.name;

                    return (
                      <div key={dateKey} className="flex flex-col min-h-[72px]">
                        {/* Day label */}
                        <div className="py-1 bg-muted/10 border-b">
                          <p className="font-semibold text-[10px] text-muted-foreground uppercase">
                            {format(day, "EEE", { locale: fr })}
                          </p>
                          <p className="font-medium text-[10px] text-muted-foreground">
                            {format(day, "d")}
                          </p>
                        </div>

                        {/* Shift or absence or empty */}
                        <div
                          className="flex-1 flex flex-col items-center justify-center gap-0.5 px-0.5 py-1.5"
                          style={
                            colour && shift && shift.store_id != null
                              ? { backgroundColor: colour.bg }
                              : undefined
                          }
                        >
                          {shift ? (
                            <>
                              {shift.store_id != null && (
                                <>
                                  <span
                                    className="font-mono font-bold text-[10px] leading-none"
                                    style={colour ? { color: colour.text } : undefined}
                                  >
                                    {shift.start_time}
                                  </span>
                                  <span
                                    className="font-mono font-bold text-[10px] leading-none"
                                    style={colour ? { color: colour.text } : undefined}
                                  >
                                    {shift.end_time}
                                  </span>
                                  {storeName && (
                                    <span
                                      className="text-[8px] leading-none font-medium mt-0.5 truncate max-w-full px-0.5"
                                      style={colour ? { color: colour.text } : { color: "#64748b" }}
                                    >
                                      {storeName}
                                    </span>
                                  )}
                                </>
                              )}
                              {shift.absence_type && (
                                <span
                                  className={cn(
                                    "text-[9px] font-bold uppercase px-1 py-0.5 rounded",
                                    shift.store_id != null && "mt-0.5",
                                    ABSENCE_STYLE[shift.absence_type],
                                  )}
                                >
                                  {ABSENCE_LABEL[shift.absence_type]}
                                  {getShiftAbsenceHours(shift) > 0 &&
                                    ` ${fmt(getShiftAbsenceHours(shift))}`}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground/30 text-[10px]">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </main>

      <footer className="border-t mt-8 py-4 text-center text-xs text-muted-foreground">
        Neuhaus Planner · Read-only view
      </footer>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ weekLabel: string }> }) {
  const { weekLabel } = await params;
  const label = decodeURIComponent(weekLabel);
  return { title: `Planning ${label} · Neuhaus` };
}

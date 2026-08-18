import { Availability, DayAvailability, Shift, User, Week } from "./types";
import { Sun, Sunset, Clock, X } from "lucide-react";
import { addDays } from "date-fns";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

function convertToCSV(data: Availability[]) {
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((obj) => Object.values(obj).join(","));
  return [headers, ...rows].join("\n");
}

function getShiftWorkedHours(shift: Shift): number {
  return shift.store_id != null ? shift.hours : 0;
}

function getShiftAbsenceHours(shift: Shift): number {
  if (!shift.absence_type) return 0;
  if (shift.absence_hours != null) return shift.absence_hours;
  // Legacy rows (pre-migration) stored the absence amount directly in `hours`.
  return shift.store_id == null ? shift.hours : 0;
}

function getWeekDateRange(weekNumber: number, year: number) {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (weekNumber - 1) * 7 - firstDayOfYear.getDay() + 1;
  const startDate = new Date(year, 0, 1 + daysOffset);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const format = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return `${format(startDate)} - ${format(endDate)}`;
}

const AVAILABILITY_STYLES: Record<
  DayAvailability,
  { label: string; short: string; icon: typeof Sun; color: string; dot: string }
> = {
  morning: {
    label: "Morning",
    short: "AM",
    icon: Sun,
    color: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  afternoon: {
    label: "Afternoon",
    short: "PM",
    icon: Sunset,
    color: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  whole_day: {
    label: "Full Day",
    short: "All",
    icon: Clock,
    color: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
  },
  not_available: {
    label: "Not Available",
    short: "N/A",
    icon: X,
    color: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

// const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_KEYS: (keyof Availability)[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/**
 * Shifts starting from this hour never get a break: staff start leaving between
 * 18:00 and 20:00, so pulling someone off the floor for 30min would leave the
 * store short. Confirmed against two years of the manager's plannings — of the
 * 11 historical shifts starting at 16:00 that run past 5h, none took a break,
 * while 82% of those starting in the 15:00 hour did.
 */
const NO_BREAK_FROM_HOUR = 16;

/** A shift longer than this many gross hours earns a break, if it starts early enough. */
const BREAK_AFTER_GROSS_HOURS = 5;

function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm || "").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function grossShiftHours(start: string, end: string): number {
  const gross = (toMinutes(end) - toMinutes(start)) / 60;
  return gross > 0 ? gross : 0;
}

/**
 * Whether 30min comes off this shift: only when it starts before 16:00 *and*
 * runs longer than 5h gross.
 */
function shiftHasBreak(start: string, end: string): boolean {
  if (toMinutes(start) >= NO_BREAK_FROM_HOUR * 60) return false;
  return grossShiftHours(start, end) > BREAK_AFTER_GROSS_HOURS;
}

/** Net (paid) hours for a shift window, after any break deduction. */
function netShiftHours(start: string, end: string): number {
  const gross = grossShiftHours(start, end);
  return shiftHasBreak(start, end) ? gross - 0.5 : gross;
}

/**
 * True when a student marked at least one day of the week as available.
 *
 * Desired hours are only meaningful — and only required — in that case: a week
 * marked fully unavailable has nothing to request hours for.
 */
function hasAnyAvailability(week: Record<string, DayAvailability> | undefined): boolean {
  if (!week) return false;
  return DAY_KEYS.some((key) => {
    const value = week[key as string];
    return !!value && value !== "not_available";
  });
}

function getWeekStartDate(weekNumber: number, year: number): Date {
  // ISO week: Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Convert Sunday=0 to 7
  const mondayOfWeek1 = addDays(jan4, 1 - jan4Day);
  return addDays(mondayOfWeek1, (weekNumber - 1) * 7);
}

function getAvailabilityForDate(
  date: Date,
  availabilityData: Availability[],
  users: User[],
  weeks: Week[],
): Array<{ user: User; availability: DayAvailability; hours: number; week_id: string }> {
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0, Sun=6
  const dayKey = DAY_KEYS[dayIndex];
  // console.log("DayKey -> ,", dayKey);

  const results: Array<{
    user: User;
    availability: DayAvailability;
    hours: number;
    week_id: string;
  }> = [];

  // Find which week this date belongs to
  const matchingWeek = weeks.find((week) => {
    const weekStart = getWeekStartDate(week.week_number, week.year);
    const weekEnd = addDays(weekStart, 6);
    return date >= weekStart && date <= weekEnd;
  });
  // console.log("Is is a matching week? -> ", matchingWeek);
  if (matchingWeek) {
    // console.log("Do we come here? -> ", availabilityData);

    // Find availability for this specific week
    availabilityData.forEach((a) => {
      // console.log("a.week_id === matchingWeek.id: ", a.week_id === matchingWeek.id);
      if (a.week_id === matchingWeek.id) {
        const dayAvailability = a[dayKey] as DayAvailability;
        // console.log("dayAvailability: ", dayAvailability);
        const user = users.find((u) => u.email === a.email);
        console.log("User = ", user);
        if (user) {
          // console.log("PUSHHH");
          results.push({
            user,
            availability: dayAvailability,
            hours: a.hours,
            week_id: a.week_id,
          });
        }
        // if (dayAvailability !== "not_available") {

        // }
      }
    });
  }

  // Sort: whole_day first, then morning, then afternoon
  const priority: Record<DayAvailability, number> = {
    whole_day: 3,
    morning: 2,
    afternoon: 1,
    not_available: 0,
  };
  results.sort((a, b) => priority[b.availability] - priority[a.availability]);
  // console.log("FROM BACKEND: ", results);
  return results;
}

/** Coarse "3h ago" style relative timestamp for feeds. */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export {
  getInitials,
  timeAgo,
  convertToCSV,
  getWeekDateRange,
  AVAILABILITY_STYLES,
  DAY_KEYS,
  hasAnyAvailability,
  grossShiftHours,
  shiftHasBreak,
  netShiftHours,
  getWeekStartDate,
  getAvailabilityForDate,
  getShiftWorkedHours,
  getShiftAbsenceHours,
};

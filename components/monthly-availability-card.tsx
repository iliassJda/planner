"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/help_functions";
import { AVAILABILITY_STYLES, getAvailabilityForDate } from "@/help_functions";
import type { Availability, DayAvailability, User, Week } from "@/types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

interface MonthlyAvailabilityCardProps {
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  availabilityData: Availability[];
  users: User[];
  weeks: Week[];
}

export default function MonthlyAvailabilityCard({
  currentMonth,
  onMonthChange,
  availabilityData,
  users,
  weeks,
}: MonthlyAvailabilityCardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Build the calendar grid (Mon-Sun weeks)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const selectedDayData = selectedDate
    ? getAvailabilityForDate(selectedDate, availabilityData, users, weeks)
    : [];

  return (
    <>
      <Card>
        {/* Month Navigation */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy")}</CardTitle>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-y">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="flex items-center justify-center py-2 text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((date) => {
              const dayData = getAvailabilityForDate(date, availabilityData, users, weeks);
              const inCurrentMonth = isSameMonth(date, currentMonth);
              const today = isToday(date);
              const maxDots = 3;
              const visibleDots = dayData.slice(0, maxDots);
              const extraCount = dayData.length - maxDots;

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDayClick(date)}
                  className={cn(
                    "relative flex min-h-[120px] flex-col items-start border-b border-r p-2 text-left transition-colors hover:bg-muted/50",
                    !inCurrentMonth && "bg-muted/20",
                  )}
                >
                  {/* Day number */}
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      !inCurrentMonth && "text-muted-foreground/40",
                      today && "bg-primary text-primary-foreground font-bold",
                    )}
                  >
                    {format(date, "d")}
                  </span>

                  {/* Availability entries */}
                  {dayData.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1 w-full">
                      {visibleDots.map((entry, i) => {
                        const style = AVAILABILITY_STYLES[entry.availability];
                        return (
                          <div
                            key={`${entry.user.email}-${i}`}
                            className={cn(
                              "flex items-center gap-1.5 w-full rounded-md px-2 py-1 text-xs font-medium transition-colors",
                              entry.availability === "whole_day" &&
                                "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-100",
                              entry.availability === "morning" &&
                                "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-100",
                              entry.availability === "afternoon" &&
                                "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-100",
                            )}
                          >
                            <span
                              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)}
                            />
                            <span className="truncate leading-tight">
                              {entry.user.first_name}
                            </span>
                          </div>
                        );
                      })}
                      {extraCount > 0 && (
                        <div className="mt-1 rounded-md bg-muted/50 px-2 py-1">
                          <span className="text-[10px] text-muted-foreground font-medium dark:text-muted-foreground/90">
                            +{extraCount} more
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogTitle>
            <DialogDescription>
              {selectedDayData.length > 0
                ? `${selectedDayData.length} student${
                    selectedDayData.length > 1 ? "s" : ""
                  } available`
                : "No students available on this day"}
            </DialogDescription>
          </DialogHeader>

          {selectedDayData.length > 0 ? (
            <div className="space-y-4">
              {/* Summary counts */}
              <div className="grid grid-cols-3 gap-3">
                {(["morning", "afternoon", "whole_day"] as DayAvailability[]).map((type) => {
                  const style = AVAILABILITY_STYLES[type];
                  const Icon = style.icon;
                  const count = selectedDayData.filter((d) => d.availability === type).length;
                  return (
                    <div
                      key={type}
                      className="flex flex-col items-center gap-1 rounded-lg border p-3"
                    >
                      <Icon className={cn("h-5 w-5", style.color)} />
                      <span className="text-xl font-bold">{count}</span>
                      <span className="text-xs text-muted-foreground">{style.label}</span>
                    </div>
                  );
                })}
              </div>
              {/* Student list */}
              <div className="space-y-2">
                {selectedDayData.map((entry) => {
                  const style = AVAILABILITY_STYLES[entry.availability];
                  const Icon = style.icon;
                  return (
                    <div
                      key={entry.user.email}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={entry.user.image}
                            alt={entry.user.first_name}
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(entry.user.first_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{entry.user.first_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.user.email}
                            {entry.hours > 0 && ` • ${entry.hours}h desired`}
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                          style.color,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{style.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Calendar className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No availability</p>
              <p className="text-sm text-muted-foreground">
                No students submitted availability for this day.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

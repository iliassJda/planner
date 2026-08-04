"use client";

import { addDays, format, getISOWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/help_functions";
import { AVAILABILITY_STYLES, getAvailabilityForDate } from "@/help_functions";
import type { Availability, DayAvailability, User, Week } from "@/types";

interface WeeklyAvailabilityCardProps {
  currentWeekStart: Date;
  onWeekChange: (weekStart: Date) => void;
  sortBy: "name" | "hours";
  onSortByChange: (sortBy: "name" | "hours") => void;
  availabilityData: Availability[];
  users: User[];
  weeks: Week[];
  comments: Record<string, Record<string, string>>;
}

export default function WeeklyAvailabilityCard({
  currentWeekStart,
  onWeekChange,
  sortBy,
  onSortByChange,
  availabilityData,
  users,
  weeks,
  comments,
}: WeeklyAvailabilityCardProps) {
  // Get availability for the current week view
  const getWeeklyAvailability = (weekStart: Date) => {
    const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i));
    const studentMap = new Map<
      string,
      {
        user: User;
        days: Record<string, { availability: DayAvailability; hours: number; week_id: string }>;
        hasAvailability: boolean;
      }
    >();

    // For each day in the week
    weekDays.forEach((date) => {
      const dayData = getAvailabilityForDate(date, availabilityData, users, weeks);
      console.log("All data: ", dayData);
      dayData.forEach((entry) => {
        if (!studentMap.has(entry.user.email)) {
          studentMap.set(entry.user.email, {
            user: entry.user,
            days: {},
            hasAvailability: true,
          });
        }
        const student = studentMap.get(entry.user.email);
        if (student) {
          student.days[format(date, "yyyy-MM-dd")] = {
            availability: entry.availability,
            hours: entry.hours,
            week_id: entry.week_id,
          };
        }
      });
    });

    // Add students who did not submit any availability for this week
    users.forEach((u) => {
      if (!studentMap.has(u.email)) {
        studentMap.set(u.email, {
          user: u,
          days: {},
          hasAvailability: false,
        });
      }
    });

    return { weekDays, weekStudents: Array.from(studentMap.values()) };
  };

  let { weekStudents } = getWeeklyAvailability(currentWeekStart);
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(currentWeekStart, i));

  // Apply sorting based on sortBy state — students without availability always go last
  if (sortBy === "name") {
    weekStudents = [...weekStudents].sort((a, b) => {
      if (a.hasAvailability !== b.hasAvailability) return a.hasAvailability ? -1 : 1;
      return a.user.first_name.localeCompare(b.user.first_name);
    });
  } else if (sortBy === "hours") {
    weekStudents = [...weekStudents].sort((a, b) => {
      if (a.hasAvailability !== b.hasAvailability) return a.hasAvailability ? -1 : 1;
      // Get hours for each student (from the first available day)
      const aFirstDay = weekDays.find((d) => a.days[format(d, "yyyy-MM-dd")]);
      const bFirstDay = weekDays.find((d) => b.days[format(d, "yyyy-MM-dd")]);
      const aHours = aFirstDay ? (a.days[format(aFirstDay, "yyyy-MM-dd")]?.hours ?? 0) : 0;
      const bHours = bFirstDay ? (b.days[format(bFirstDay, "yyyy-MM-dd")]?.hours ?? 0) : 0;
      // Sort descending (highest hours first)
      return bHours - aHours;
    });
  }

  return (
    <Card>
      {/* Week Navigation */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onWeekChange(addDays(currentWeekStart, -7))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <CardTitle className="text-lg">Week {getISOWeek(currentWeekStart)}</CardTitle>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onWeekChange(addDays(currentWeekStart, 7))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-0 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 mb-0">
            <span className="text-sm font-semibold text-foreground">Sort by:</span>
            <div className="flex gap-2">
              <Button
                variant={sortBy === "name" ? "default" : "outline"}
                onClick={() => onSortByChange("name")}
                size="sm"
              >
                Name (A-Z)
              </Button>
              <Button
                variant={sortBy === "hours" ? "default" : "outline"}
                onClick={() => onSortByChange("hours")}
                size="sm"
              >
                Hours
              </Button>
            </div>
          </div>
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 border-b border-r bg-muted p-2 sm:p-3 text-left font-medium w-32 sm:w-40 z-10">
                  <div className="text-xs sm:text-sm">Student</div>
                </th>
                {weekDays.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="border-b border-r bg-muted p-1 sm:p-3 text-center font-medium w-20 sm:w-28 flex-shrink-0"
                  >
                    <div className="font-semibold text-xs sm:text-sm">{format(day, "EEE")}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      {format(day, "d MMM")}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekStudents.length > 0 ? (
                weekStudents.map((entry) => (
                  <tr
                    key={entry.user.email}
                    className={cn("hover:bg-muted/50", !entry.hasAvailability && "opacity-50")}
                  >
                    <td className="sticky left-0 border-b border-r bg-card p-2 sm:p-3 z-10">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Avatar className="h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0">
                          <AvatarImage
                            src={entry.user.image}
                            alt={entry.user.first_name}
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback className="text-[10px] sm:text-sm">
                            {getInitials(entry.user.first_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {entry.user.first_name}
                          </p>
                          {entry.hasAvailability ? (
                            (() => {
                              const firstDay = weekDays.find(
                                (d) => entry.days[format(d, "yyyy-MM-dd")],
                              );
                              const firstDayData = firstDay
                                ? entry.days[format(firstDay, "yyyy-MM-dd")]
                                : undefined;
                              const weekId = firstDayData?.week_id;
                              const comment = weekId && comments[entry.user.email]?.[weekId];
                              const hours = firstDayData?.hours;
                              return (
                                <div className="max-w-40 w-36 min-w-0">
                                  <p className="text-[9px] sm:text-xs text-muted-foreground break-words">
                                    {comment}
                                    {comment && hours != null && hours > 0 && " • "}
                                    {hours != null && hours > 0 && `${hours}h`}
                                  </p>
                                </div>
                              );
                            })()
                          ) : (
                            <p className="text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-rose-500 dark:text-rose-400">
                              No availability
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {weekDays.map((day) => {
                      const dayKey = format(day, "yyyy-MM-dd");
                      const dayData = entry.days[dayKey];

                      if (!dayData) {
                        return (
                          <td
                            key={dayKey}
                            className="border-b border-r p-1 sm:p-2 text-center h-16 sm:h-20 w-20 sm:w-28 flex-shrink-0"
                          >
                            <span className="text-[9px] sm:text-xs text-muted-foreground">
                              {entry.hasAvailability ? "N/A" : "—"}
                            </span>
                          </td>
                        );
                      }

                      const style = AVAILABILITY_STYLES[dayData.availability];
                      const Icon = style.icon;
                      return (
                        <td
                          key={dayKey}
                          className={cn(
                            "border-b border-r p-1 sm:p-2 text-center h-16 sm:h-20 w-20 sm:w-28 flex-shrink-0",
                            dayData.availability === "whole_day" &&
                              "bg-green-100 dark:bg-green-900/20",
                            dayData.availability === "morning" &&
                              "bg-amber-100 dark:bg-amber-900/20",
                            dayData.availability === "afternoon" &&
                              "bg-blue-100 dark:bg-blue-900/20",
                          )}
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5 h-full">
                            <Icon className={cn("h-3 w-3 sm:h-4 sm:w-4", style.color)} />
                            <span className={cn("text-[9px] sm:text-xs font-medium", style.color)}>
                              {style.short}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="border-b p-4 sm:p-8 text-center text-xs sm:text-base text-muted-foreground"
                  >
                    No availabilities for this week
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { startOfWeek, format, getISOWeek, getISOWeekYear } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Sun, Sunset, Clock, X, RefreshCw, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  exportAvailability,
  getAllAvailability,
  getAllUsers,
  getAllWeeks,
  getComments,
  getCsvAvailabilities,
} from "@/action/supabase";
import type { Availability, User, Week } from "@/types";
import UserSkeleton from "@/components/user-skeleton";
import MonthlyAvailabilityCard from "@/components/monthly-availability-card";
import WeeklyAvailabilityCard from "@/components/weekly-availability-card";

export default function DataPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [comments, setComments] = useState<Record<string, Record<string, string>>>({});
  const [viewMode, setViewMode] = useState<"month" | "week">("week");
  const [sortBy, setSortBy] = useState<"name" | "hours">("name");
  const [availabilityData, setAvailabilityData] = useState<Availability[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [availRes, usersRes, weeksRes, commentsRes] = await Promise.all([
        getAllAvailability(),
        getAllUsers(),
        getAllWeeks(),
        getComments(),
      ]);
      // console.log("These is all the data: ", availRes, usersRes, weeksRes, commentsRes);
      const allowedUsers = usersRes.filter((u) => u.allowed && u.role == "student");
      setAvailabilityData(availRes);
      setUsers(allowedUsers);
      setWeeks(weeksRes);
      const commentsMap: Record<string, Record<string, string>> = {};
      commentsRes.forEach((comment) => {
        if (!commentsMap[comment.email]) {
          commentsMap[comment.email] = {};
        }

        commentsMap[comment.email][comment.week_id] = comment.comment;
        // console.log("These are the comments: ", commentsMap[comment.email]);
      });
      setComments(commentsMap);
      // console.log("Fetched comments:", commentsMap);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const rows = await exportAvailability();
      const currentIsoWeek = getISOWeek(currentWeekStart);
      const currentIsoYear = getISOWeekYear(currentWeekStart);
      const currentWeek = weeks.find(
        (week) => week.week_number === currentIsoWeek && week.year === currentIsoYear,
      );

      const weekRows = currentWeek
        ? rows.filter((row) => row.week_id === currentWeek.id)
        : rows.filter((row) => row.week_number === currentIsoWeek);
      if (availabilityData && availabilityData.length > 0) {
        // Create CSV content
        const csvContent = await getCsvAvailabilities(weekRows);

        // Create and download the file
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", `availability-week-${getISOWeek(currentWeekStart)}.csv`);
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        toast.error("No availability data to export");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error("Unable to open print preview. Please allow pop-ups.");
      setPrinting(false);
      return;
    }

    // printWindow.document.write(`
    //   <!doctype html>
    //   <html>
    //     <head>
    //       <meta charset="utf-8" />
    //       <title>Preparing print...</title>
    //       <style>
    //         body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    //         p { color: #444; }
    //       </style>
    //     </head>
    //     <body>
    //       <p>Preparing availability report...</p>
    //     </body>
    //   </html>
    // `);
    // printWindow.document.close();

    try {
      const rows = await exportAvailability();
      const currentIsoWeek = getISOWeek(currentWeekStart);
      const currentIsoYear = getISOWeekYear(currentWeekStart);
      const currentWeek = weeks.find(
        (week) => week.week_number === currentIsoWeek && week.year === currentIsoYear,
      );

      const weekRows = currentWeek
        ? rows.filter((row) => row.week_id === currentWeek.id)
        : rows.filter((row) => row.week_number === currentIsoWeek);

      if (!weekRows || weekRows.length === 0) {
        printWindow.close();
        toast.error("No availability data to print for this week");
        return;
      }

      const title = `Availability Report - Week ${currentIsoWeek}`;
      const tableRows = weekRows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.email)}</td>
              <td>${escapeHtml(row.week_id)}</td>
              <td>${escapeHtml(row.monday)}</td>
              <td>${escapeHtml(row.tuesday)}</td>
              <td>${escapeHtml(row.wednesday)}</td>
              <td>${escapeHtml(row.thursday)}</td>
              <td>${escapeHtml(row.friday)}</td>
              <td>${escapeHtml(row.saturday)}</td>
              <td>${escapeHtml(row.sunday)}</td>
              <td>${escapeHtml(row.week_number)}</td>
              <td>${escapeHtml(row.hours)}</td>
              <td>${escapeHtml(row.comment)}</td>
            </tr>
          `,
        )
        .join("");

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(title)}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
              h1 { margin: 0 0 8px; font-size: 20px; }
              p { margin: 0 0 16px; color: #444; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              th, td { border: 1px solid #d4d4d8; padding: 6px 8px; text-align: left; }
              th { background: #f4f4f5; }
              tr:nth-child(even) { background: #fafafa; }
              @media print {
                body { margin: 12px; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
              }
            </style>
          </head>
          <body>
            <h1>${escapeHtml(title)}</h1>
            <p>Generated on ${escapeHtml(format(new Date(), "PPpp"))}</p>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Week ID</th>
                  <th>Monday</th>
                  <th>Tuesday</th>
                  <th>Wednesday</th>
                  <th>Thursday</th>
                  <th>Friday</th>
                  <th>Saturday</th>
                  <th>Sunday</th>
                  <th>Week Number</th>
                  <th>Hours Desired</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      toast.success("Print dialog opened");
    } catch (error) {
      console.error("Error printing data:", error);
      toast.error("Failed to print data");
    } finally {
      setPrinting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Stats
  const activeWeeksCount = [...new Set(availabilityData.map((a) => a.week_number))].length;
  const studentsSubmitted = [...new Set(availabilityData.map((a) => a.email))].length;
  const totalSubmissions = availabilityData.length;

  if (loading) {
    return <UserSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Availability Overview</h1>
            <p className="text-muted-foreground">
              View student availability across all active weeks
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                handleDownload();
                toast.success("Data downloaded");
              }}
              disabled={downloading || printing}
            >
              <Download className={cn("mr-2 h-4 w-4", downloading && "animate-bounce")} />
              {downloading ? "Downloading..." : "Download"}
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={printing || downloading}>
              <Printer className={cn("mr-2 h-4 w-4", printing && "animate-pulse")} />
              {printing ? "Preparing..." : "Print"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                fetchData();
                toast.success("Data refreshed");
              }}
              disabled={refreshing}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex flex-col gap-3">
          {/* <div className="flex gap-2">
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              onClick={() => setViewMode("week")}
              size="sm"
            >
              Weekly View
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              onClick={() => setViewMode("month")}
              size="sm"
            >
              Monthly View
            </Button>
          </div> */}

          {/* Sort Options - Only show in week view */}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg p-3">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeWeeksCount}</p>
              <p className="text-sm text-muted-foreground">Weeks with submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg p-3">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{studentsSubmitted}</p>
              <p className="text-sm text-muted-foreground">Students submitted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg p-3">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSubmissions}</p>
              <p className="text-sm text-muted-foreground">Total submissions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-sm">Full Day</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-sm">Morning</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-sm">Afternoon</span>
        </div>
        <p className="text-sm text-muted-foreground ml-auto">
          {viewMode === "month" ? "Click on a day to see details" : ""}
        </p>
      </div>

      {/* <MonthlyAvailabilityCard
        //   currentMonth={currentMonth}
        //   onMonthChange={setCurrentMonth}
        //   availabilityData={availabilityData}
        //   users={users}
        //   weeks={weeks}
        // / */}

      <WeeklyAvailabilityCard
        currentWeekStart={currentWeekStart}
        onWeekChange={setCurrentWeekStart}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        availabilityData={availabilityData}
        users={users}
        weeks={weeks}
        comments={comments}
      />
    </div>
  );
}

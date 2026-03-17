"use client";

import { useEffect, useState, useMemo } from "react";
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
	getISOWeek,
	getISOWeekYear,
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
import {
	ChevronLeft,
	ChevronRight,
	Calendar,
	Users,
	Sun,
	Sunset,
	Clock,
	X,
	RefreshCw,
	Download,
	Printer,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getInitials } from "@/help_functions";
import {
	exportAvailability,
	getAllAvailability,
	getAllUsers,
	getAllWeeks,
	getComments,
	getCsvAvailabilities,
} from "@/action/supabase";
import type { Availability, DayAvailability, User, Week } from "@/types";
import UserSkeleton from "@/components/user-skeleton";

import { AVAILABILITY_STYLES, getAvailabilityForDate } from "@/help_functions";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export default function DataPage() {
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
		startOfWeek(new Date(), { weekStartsOn: 1 }),
	);
	const [comments, setComments] = useState<Record<string, Record<string, string>>>({});
	const [viewMode, setViewMode] = useState<"month" | "week">("week");
	const [availabilityData, setAvailabilityData] = useState<Availability[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [weeks, setWeeks] = useState<Week[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [printing, setPrinting] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

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

	// Get availability for a specific week view
	const getWeeklyAvailability = (weekStart: Date) => {
		const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i));
		const studentMap = new Map<
			string,
			{
				user: User;
				days: Record<string, { availability: DayAvailability; hours: number; week_id: string }>;
			}
		>();

		// For each day in the week
		weekDays.forEach((date) => {
			const dayData = getAvailabilityForDate(date, availabilityData, users, weeks);
			dayData.forEach((entry) => {
				if (!studentMap.has(entry.user.email)) {
					studentMap.set(entry.user.email, {
						user: entry.user,
						days: {},
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

		return { weekDays, weekStudents: Array.from(studentMap.values()) };
	};

	// Stats
	const activeWeeksCount = [...new Set(availabilityData.map((a) => a.week_number))].length;
	const studentsSubmitted = [...new Set(availabilityData.map((a) => a.email))].length;
	const totalSubmissions = availabilityData.length;

	if (loading) {
		return <UserSkeleton />;
	}

	const selectedDayData = selectedDate
		? getAvailabilityForDate(selectedDate, availabilityData, users, weeks)
		: [];

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
				<div className="flex gap-2">
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

			{viewMode === "month" ? (
				/* Monthly View */
				<Card>
					{/* Month Navigation */}
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy")}</CardTitle>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
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
								// console.log(`Date: ${format(date, "yyyy-MM-dd")}, Availability entries:`, dayData);
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
											// Remove right border on the last column (every 7th cell)
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
																{/* {entry.hours > 0 && ` (${entry.hours}h)`} */}
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
			) : (
				/* Weekly View */
				<Card>
					{/* Week Navigation */}
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<CardTitle className="text-lg">
							Week {getISOWeek(currentWeekStart)}
							{/* ({format(currentWeekStart, "MMM d")} –{" "}
              {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}) */}
						</CardTitle>
						<Button
							variant="outline"
							size="icon"
							onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</CardHeader>

					<CardContent className="p-0 overflow-hidden">
						{(() => {
							const { weekDays, weekStudents } = getWeeklyAvailability(currentWeekStart);

							return (
								<div className="w-full overflow-x-auto">
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
														<div className="font-semibold text-xs sm:text-sm">
															{format(day, "EEE")}
														</div>
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
													<tr key={entry.user.email} className="hover:bg-muted/50">
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
																<div className="min-w-0 flex-1 max-w-xs">
																	<p className="text-xs sm:text-sm font-medium truncate">
																		{entry.user.first_name}
																	</p>
																	{(() => {
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
																			<p className="text-[9px] sm:text-xs text-muted-foreground whitespace-normal break-words">
																				{comment}
																				{comment && hours != null && hours > 0 && " • "}
																				{hours != null && hours > 0 && `${hours}h`}
																			</p>
																		);
																	})()}
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
																			N/A
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
																		<span
																			className={cn(
																				"text-[9px] sm:text-xs font-medium",
																				style.color,
																			)}
																		>
																			{style.short}
																		</span>
																		{/* {dayData.hours > 0 && (
																			<span className="text-[8px] sm:text-xs text-muted-foreground">
																				{dayData.hours}h
																			</span>
																		)} */}
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
							);
						})()}
					</CardContent>
				</Card>
			)}

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
								: // (selectedDayData.some((d) => d.hours > 0)
									// 	? ` • Total desired: ${selectedDayData.reduce((sum, d) => sum + d.hours, 0)}h`
									// 	: "")
									"No students available on this day"}
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
													{/* <Image src={entry.user.image} alt={entry.user.first_name} fill /> */}
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
		</div>
	);
}

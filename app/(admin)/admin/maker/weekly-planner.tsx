"use client";

// import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/help_functions";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/user-context";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	getAllWeeks,
	getAllAvailability,
	getAllUsers,
	getAllStoresFromRegion,
	insertShift,
	getAllShifts,
	clearShifts,
} from "@/action/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, format } from "date-fns";
import { RefreshCw, Save, CalendarPlus } from "lucide-react";

import { Availability, User, Week, DayAvailability, Store, ShiftAssignment, Shift } from "@/types";

import { AVAILABILITY_STYLES, getWeekStartDate, getAvailabilityForDate } from "@/help_functions";

interface WeeklyPlannerProps {
	file: File | null;
}

const SHIFT_TIME_OPTIONS = Array.from({ length: 53 }, (_, index) => {
	const totalMinutes = 9 * 60 + index * 15;
	const hour = Math.floor(totalMinutes / 60);
	const minute = totalMinutes % 60;
	return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

export default function WeeklyPlanner({}: WeeklyPlannerProps) {
	const user = useUser();
	const [currentWeek, setCurrentWeek] = useState<string>("null");
	const [weeks, setWeeks] = useState<Week[]>([]);
	const [isLoadingWeeks, setIsLoadingWeeks] = useState(true);
	const [availabilityData, setAvailabilityData] = useState<Availability[]>([]);
	const [stores, setStores] = useState<Store[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedStudent, setSelectedStudent] = useState<{
		user: User;
		days: Record<string, { availability: DayAvailability; hours: number; week_id: string }>;
	} | null>(null);
	const [selectedDay, setSelectedDay] = useState<Date | null>(null);
	const [selectedStoreId, setSelectedStoreId] = useState<number>(0);
	const [shiftStart, setShiftStart] = useState("09:00");
	const [shiftEnd, setShiftEnd] = useState("17:00");
	const [customShiftStart, setCustomShiftStart] = useState("");
	const [customShiftEnd, setCustomShiftEnd] = useState("");
	const [assignedShifts, setAssignedShifts] = useState<Shift[]>([]);
	// useState<
	// 	Array<{
	// 		id?: string;
	// 		email: string;
	// 		shift_date: string;
	// 		store_id: number;
	// 		start_time: string;
	// 		end_time: string;
	// 		hours: number;
	// 	}>
	// >([]);
	const [saveMessage, setSaveMessage] = useState<string>("");
	const [clearDialog, setClearDialog] = useState(false);
	// const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
	// 	startOfWeek(new Date(), { weekStartsOn: 1 }),
	// );

	const getWeeklyAvailability = (week_label: string) => {
		const correctWeek = weeks.find((week) => week.week_label === week_label);
		if (!correctWeek) return { weekDays: [], weekStudents: [] };

		const weekStart = getWeekStartDate(correctWeek.week_number, correctWeek.year);
		// console.log("THis is the start of the week: ", weekStart);
		const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i));
		// console.log("Weekdays -> ", weekDays);
		const studentMap = new Map<
			string,
			{
				user: User;
				days: Record<string, { availability: DayAvailability; hours: number; week_id: string }>;
			}
		>();

		// For each day in the week
		weekDays.forEach((date) => {
			// console.log("For this day: ", date);
			const dayData = getAvailabilityForDate(date, availabilityData, users, weeks);
			// console.log("Day data -> ", dayData);
			dayData.forEach((entry) => {
				if (!studentMap.has(entry.user.email)) {
					studentMap.set(entry.user.email, {
						user: entry.user,
						days: {},
					});
				}
				const student = studentMap.get(entry.user.email);
				// console.log("student? -> ", student);
				if (student) {
					// console.log("YESSS DATA");
					student.days[format(date, "yyyy-MM-dd")] = {
						availability: entry.availability,
						hours: entry.hours,
						week_id: entry.week_id,
					};
				}
			});
		});
		const studentResult = Array.from(studentMap.values());
		// console.log("For ", week_label);
		// console.log("This is the studentResult => ", studentResult);

		return { weekDays, weekStudents: studentResult };
	};

	const handleCellClick = (student: typeof selectedStudent, day: Date) => {
		const dayKey = format(day, "yyyy-MM-dd");
		const existingShift = assignedShifts.find(
			(s) => s.email === student?.user.email && s.shift_date === dayKey,
		);

		setSelectedStoreId(existingShift?.store_id ?? stores[0]?.id ?? 0);
		setShiftStart(existingShift?.start_time ?? "09:00");
		setShiftEnd(existingShift?.end_time ?? "17:00");
		setCustomShiftStart("");
		setCustomShiftEnd("");
		setSelectedStudent(student);
		setSelectedDay(day);
		setDialogOpen(true);
	};

	const getShiftsForCurrentWeek = () => {
		if (currentWeek === "null") return [];

		const week = weeks.find((w) => w.week_label === currentWeek);
		if (!week) return [];

		// Get the start and end dates of the week
		const weekStart = getWeekStartDate(week.week_number, week.year);
		const weekEnd = addDays(weekStart, 6);

		return assignedShifts.filter((shift) => {
			const shiftDate = new Date(shift.shift_date);
			return shiftDate >= weekStart && shiftDate <= weekEnd;
		});
	};

	const getShiftDurationHours = (start: string, end: string) => {
		const [startHour, startMinute] = start.split(":").map(Number);
		const [endHour, endMinute] = end.split(":").map(Number);
		const startTotalMinutes = startHour * 60 + startMinute;
		const endTotalMinutes = endHour * 60 + endMinute;
		return (endTotalMinutes - startTotalMinutes) / 60;
	};

	const getAssignedHoursForStudent = (email: string, weekDays: Date[]) => {
		const weekDayStrings = weekDays.map((day) => format(day, "yyyy-MM-dd"));
		return assignedShifts
			.filter((s) => s.email === email && weekDayStrings.includes(s.shift_date))
			.reduce((sum, shift) => sum + shift.hours, 0);
	};

	const validateTimeFormat = (time: string): boolean => {
		const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
		return timeRegex.test(time);
	};

	const effectiveStart =
		customShiftStart && validateTimeFormat(customShiftStart) ? customShiftStart : shiftStart;
	const effectiveEnd =
		customShiftEnd && validateTimeFormat(customShiftEnd) ? customShiftEnd : shiftEnd;
	const effectiveIsInvalid = effectiveEnd <= effectiveStart;

	const handleSaveShift = () => {
		if (!selectedStudent?.user.email || !selectedDay || effectiveIsInvalid || !selectedStoreId) {
			return;
		}

		const email = selectedStudent.user.email;
		const dayKey = format(selectedDay, "yyyy-MM-dd");
		const hours = getShiftDurationHours(effectiveStart, effectiveEnd);

		setAssignedShifts((prev) => {
			// Check if shift already exists for this email and date
			const existingIndex = prev.findIndex((s) => s.email === email && s.shift_date === dayKey);

			if (existingIndex !== -1) {
				// Update existing shift
				const updated = [...prev];
				updated[existingIndex] = {
					...updated[existingIndex],
					store_id: selectedStoreId,
					start_time: effectiveStart,
					end_time: effectiveEnd,
					hours,
				};
				return updated;
			} else {
				// Add new shift with temporary ID (negative numbers for new unsaved shifts)
				const tempId = Math.min(...prev.map((s) => s.id || 0), 0) - 1;
				return [
					...prev,
					{
						id: tempId,
						email,
						shift_date: dayKey,
						store_id: selectedStoreId,
						start_time: effectiveStart,
						end_time: effectiveEnd,
						hours,
					},
				];
			}
		});

		setDialogOpen(false);
	};

	const hasAssignedShifts = assignedShifts.length > 0;

	const handleSaveAllShifts = async () => {
		if (!hasAssignedShifts) {
			setSaveMessage("No shifts to save yet.");
			return;
		}

		// console.log("These are the shifts for: ", assignedShifts);

		try {
			// Convert flat array to nested format for insertShift
			const nestedFormat: Record<string, Record<string, ShiftAssignment>> = {};
			assignedShifts.forEach((shift) => {
				if (!nestedFormat[shift.email]) {
					nestedFormat[shift.email] = {};
				}
				nestedFormat[shift.email][shift.shift_date] = {
					storeId: shift.store_id,
					start: shift.start_time,
					end: shift.end_time,
					hours: shift.hours,
				};
			});
			const result = await insertShift(nestedFormat);
			setSaveMessage(`Saved ${result.length} user shifts`);
		} catch {
			setSaveMessage("Could not save shifts... Try again");
		}
	};

	const handleClear = () => {
		setClearDialog(true);
	};

	const handleConfirmClear = async () => {
		const shiftsToDelete = getShiftsForCurrentWeek();

		if (shiftsToDelete.length === 0) {
			setSaveMessage("No shifts to clear for this week.");
			setClearDialog(false);
			return;
		}

		try {
			// Convert flat array to nested format for clearShifts
			// const nestedFormat: Record<string, Record<string, ShiftAssignment>> = {};
			// shiftsToDelete.forEach((shift) => {
			// 	if (!nestedFormat[shift.email]) {
			// 		nestedFormat[shift.email] = {};
			// 	}
			// 	nestedFormat[shift.email][shift.shift_date] = {
			// 		storeId: shift.store_id,
			// 		start: shift.start_time,
			// 		end: shift.end_time,
			// 		hours: shift.hours,
			// 	};
			// });
			await clearShifts(shiftsToDelete);
			setSaveMessage(`Cleared shifts for ${currentWeek}`);
		} catch {
			setSaveMessage("Could not clear shifts");
		}

		setClearDialog(false);
	};

	useEffect(() => {
		const fetchData = async () => {
			if (!user) {
				setIsLoadingWeeks(false);
				return;
			}

			setIsLoadingWeeks(true);
			try {
				const data = await getAllWeeks();
				const availabilities = await getAllAvailability();
				const stores = await getAllStoresFromRegion(user.region.name);
				const users = await getAllUsers();
				const shifts = await getAllShifts();
				// Sort by year first, then by week_number
				const sorted = data.sort((a, b) => {
					if (a.year !== b.year) {
						return a.year - b.year;
					}
					return a.week_number - b.week_number;
				});
				// setAssignedShifts(fromFlattenedToRecord(shifts));
				setAssignedShifts(shifts);
				// setAssignedShifts(
				// 	shifts.map((shift) => ({
				// 		id: shift.id.toString(),
				// 		email: shift.email,
				// 		shift_date: shift.shift_date,
				// 		store_id: shift.store_id,
				// 		start_time: shift.start_time,
				// 		end_time: shift.end_time,
				// 		hours: shift.hours,
				// 	})),
				// );
				setWeeks(sorted);
				setAvailabilityData(availabilities);
				setStores(stores);
				setSelectedStoreId((current) => current || stores[0]?.id || 0);
				setUsers(users);
			} finally {
				setIsLoadingWeeks(false);
			}
		};
		fetchData();
	}, [user]);

	// useEffect(() => {
	//   try {
	//     const savedShifts = localStorage.getItem(SHIFTS_STORAGE_KEY);
	//     if (savedShifts) {
	//       setAssignedShifts(
	//         JSON.parse(savedShifts) as Record<string, Record<string, ShiftAssignment>>,
	//       );
	//     }
	//   } catch {
	//     setSaveMessage("Could not load previously saved shifts.");
	//   }
	// }, []);

	const selectedDayKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
	const selectedDayAvailability = selectedDayKey
		? selectedStudent?.days[selectedDayKey]?.availability
		: undefined;
	const dialogDayAvailability: DayAvailability = selectedDayAvailability ?? "not_available";
	const dialogAvailabilityStyle = AVAILABILITY_STYLES[dialogDayAvailability];
	const isSelectedDayUnavailable =
		!selectedDayAvailability || selectedDayAvailability === "not_available";
	const selectedWeekIdFromDay = selectedDayKey
		? selectedStudent?.days[selectedDayKey]?.week_id
		: undefined;
	const currentWeekId = weeks.find((week) => week.week_label === currentWeek)?.id;
	const dialogWeekId = selectedWeekIdFromDay ?? currentWeekId;
	const selectedComment =
		dialogWeekId && selectedStudent?.user.email
			? availabilityData
					.find(
						(entry) => entry.email === selectedStudent.user.email && entry.week_id === dialogWeekId,
					)
					?.comment?.trim() || "No comment provided..."
			: "No comment provided...";

	if (!user) {
		return <div className="text-sm text-muted-foreground p-4">No user found.</div>;
	}

	return (
		<div className="flex flex-col space-y-4 w-full max-w-7xl mx-auto pb-10">
			<div className="space-y-1 mb-2">
				<h1 className="text-2xl font-bold tracking-tight md:text-3xl">Planner Maker</h1>
				<p className="text-muted-foreground text-sm">
					Create, edit, and manage your weekly schedules
				</p>
			</div>

			{/* Toolbar */}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
				{isLoadingWeeks ? (
					<div className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground">
						<RefreshCw className="h-4 w-4 animate-spin" />
						Loading context...
					</div>
				) : weeks.length > 0 ? (
					<div className="flex flex-wrap items-center gap-3">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="min-w-[140px] justify-between">
									{currentWeek !== "null" ? currentWeek : "Select a week..."}
									<span className="opacity-50 text-xs">▼</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-56" align="start">
								<DropdownMenuGroup>
									<DropdownMenuLabel>Available Weeks</DropdownMenuLabel>
									<DropdownMenuRadioGroup value={currentWeek} onValueChange={setCurrentWeek}>
										{weeks.map((week) => (
											<DropdownMenuRadioItem key={week.id} value={week.week_label}>
												{week.week_label}
											</DropdownMenuRadioItem>
										))}
									</DropdownMenuRadioGroup>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>

						{saveMessage && (
							<span className="text-sm font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-3 py-1 rounded-full animate-in fade-in">
								{saveMessage}
							</span>
						)}
					</div>
				) : (
					<div className="text-sm text-muted-foreground">No available weeks configured</div>
				)}

				<div className="flex items-center gap-2 w-full sm:w-auto">
					<Button
						variant="secondary"
						onClick={handleClear}
						disabled={!hasAssignedShifts || currentWeek === "null"}
						className="flex-1 sm:flex-none"
					>
						Clear Data
					</Button>
					<Button
						variant="default"
						onClick={handleSaveAllShifts}
						disabled={!hasAssignedShifts || currentWeek === "null"}
						className="flex-1 sm:flex-none shadow-sm"
					>
						<Save className="mr-2 h-4 w-4" />
						Save Schedule
					</Button>
				</div>
			</div>

			{currentWeek !== "null" ? (
				<Card className="border shadow-sm overflow-hidden flex flex-col">
					{/* Week Navigation */}
					<CardHeader className="bg-muted/30 border-b py-3 px-4">
						<CardTitle className="text-lg font-semibold text-center flex items-center justify-center gap-2">
							{/* <span className="bg-primary/10 text-primary p-1.5 rounded-md">
								<CalendarPlus className="h-4 w-4" />
							</span> */}
							{currentWeek} Schedule
						</CardTitle>
					</CardHeader>

					<CardContent className="p-0 overflow-hidden">
						{(() => {
							const { weekDays, weekStudents } = getWeeklyAvailability(currentWeek);

							return (
								<div className="w-full overflow-x-auto bg-card rounded-b-xl">
									<table className="w-full border-collapse text-xs sm:text-sm">
										<thead>
											<tr>
												<th className="sticky left-0 border-b border-border/60 bg-muted/20 p-3 sm:p-4 text-left font-medium w-36 sm:w-48 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">
													<div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
														Employee
													</div>
												</th>
												{weekDays.map((day) => (
													<th
														key={day.toISOString()}
														className="border-b border-l border-border/60 bg-muted/20 p-2 sm:p-3 text-center w-24 sm:w-32 shrink-0"
													>
														<div className="font-semibold text-sm sm:text-base text-foreground">
															{format(day, "EEE")}
														</div>
														<div className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-0.5">
															{format(day, "MMM d")}
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
														className="group hover:bg-muted/30 transition-colors"
													>
														<td className="sticky left-0 border-b border-border/60 bg-card group-hover:bg-muted/30 p-2 sm:p-3 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)] transition-colors">
															<div className="flex items-center gap-2 sm:gap-3">
																<Avatar className="h-8 w-8 sm:h-10 sm:w-10 border shadow-sm shrink-0">
																	<AvatarImage
																		src={entry.user.image}
																		alt={entry.user.first_name}
																		referrerPolicy="no-referrer"
																	/>
																	<AvatarFallback className="text-[10px] sm:text-xs font-medium bg-primary/5 text-primary">
																		{getInitials(entry.user.first_name)}
																	</AvatarFallback>
																</Avatar>
																<div className="min-w-0 flex-1 flex flex-col justify-center">
																	<p className="text-sm font-semibold truncate text-foreground leading-tight">
																		{entry.user.first_name}
																	</p>
																	{(() => {
																		const firstDay = weekDays.find(
																			(d) => entry.days[format(d, "yyyy-MM-dd")],
																		);
																		const firstDayData = firstDay
																			? entry.days[format(firstDay, "yyyy-MM-dd")]
																			: undefined;
																		const targetHours = firstDayData?.hours;
																		const assignedHours = getAssignedHoursForStudent(
																			entry.user.email,
																			weekDays,
																		);

																		// Status colors based on assignment vs target
																		let hoursColorClass = "text-muted-foreground";
																		if (targetHours && targetHours > 0) {
																			if (assignedHours === targetHours)
																				hoursColorClass = "text-emerald-600 dark:text-emerald-400";
																			else if (assignedHours > targetHours)
																				hoursColorClass = "text-amber-600 dark:text-amber-400";
																		}

																		return (
																			<div className="mt-0.5 flex items-center gap-1.5">
																				<span
																					className={cn(
																						"text-[10px] sm:text-xs font-medium truncate",
																						hoursColorClass,
																					)}
																				>
																					{assignedHours}h{" "}
																					<span className="opacity-70 font-normal">assigned</span>
																					{targetHours != null && targetHours > 0
																						? ` / ${targetHours}h`
																						: ""}
																				</span>
																			</div>
																		);
																	})()}
																</div>
															</div>
														</td>
														{weekDays.map((day) => {
															const dayKey = format(day, "yyyy-MM-dd");
															const dayAvailability = entry.days[dayKey];
															const availabilityStyle = dayAvailability
																? AVAILABILITY_STYLES[dayAvailability.availability]
																: null;
															const isUnavailableDay =
																!dayAvailability ||
																dayAvailability.availability === "not_available";
															const savedShift = assignedShifts.find(
																(s) => s.email === entry.user.email && s.shift_date === dayKey,
															);
															const savedStoreName = savedShift
																? stores.find((store) => store.id === savedShift.store_id)?.name
																: undefined;
															return (
																<td
																	key={dayKey}
																	onClick={() => handleCellClick(entry, day)}
																	className="relative border-b border-l border-border/60 p-1.5 sm:p-2 text-center h-20 sm:h-24 w-24 sm:w-32 shrink-0 cursor-pointer hover:bg-primary/5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:z-20"
																>
																	{isUnavailableDay ? (
																		<div className="pointer-events-none absolute inset-0 bg-repeating-linear-gradient-45 from-transparent to-transparent bg-[length:10px_10px] opacity-10 bg-slate-400 dark:bg-slate-600" />
																	) : null}

																	{availabilityStyle ? (
																		<div
																			className="absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-sm bg-background/80 backdrop-blur-sm px-1.5 py-0.5 shadow-sm border border-border/50"
																			title={availabilityStyle.label}
																		>
																			<span
																				className={cn(
																					"h-1.5 w-1.5 rounded-full opacity-100",
																					availabilityStyle.dot,
																				)}
																			/>
																			<span className="text-[9px] font-medium leading-none text-foreground/80">
																				{availabilityStyle.short}
																			</span>
																		</div>
																	) : null}

																	{savedShift ? (
																		<div className="relative z-10 flex h-full flex-col items-center justify-center pt-3">
																			<div className="bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-1 w-full max-w-[90%] shadow-sm flex flex-col gap-0.5">
																				<span className="text-[11px] sm:text-xs font-bold font-mono tracking-tight leading-none">
																					{savedShift.start_time} - {savedShift.end_time}
																				</span>
																				{savedStoreName && (
																					<span className="text-[9px] sm:text-[10px] font-medium opacity-80 leading-none truncate w-full">
																						{savedStoreName}
																					</span>
																				)}
																			</div>
																		</div>
																	) : (
																		<div className="relative z-10 h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
																			<div className="bg-muted rounded-md p-1.5 text-muted-foreground">
																				<CalendarPlus className="h-4 w-4" />
																			</div>
																		</div>
																	)}
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
			) : null}

			{/* Cell Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{selectedStudent?.user.first_name} -{" "}
							{selectedDay ? format(selectedDay, "EEEE, MMMM d, yyyy") : ""}
						</DialogTitle>
						<DialogDescription>
							{isSelectedDayUnavailable
								? "This student is not available on this day."
								: "Add or edit shift information for this student on this day"}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="flex items-center gap-3 pb-4 border-b">
							<Avatar className="h-10 w-10">
								<AvatarImage
									src={selectedStudent?.user.image}
									alt={selectedStudent?.user.first_name}
									referrerPolicy="no-referrer"
								/>
								<AvatarFallback className="text-sm">
									{getInitials(selectedStudent?.user.first_name || "")}
								</AvatarFallback>
							</Avatar>
							<div>
								<p className="font-medium">{selectedStudent?.user.first_name}</p>
								<p className="text-sm text-muted-foreground">{selectedStudent?.user.email}</p>
							</div>
						</div>

						<div className="space-y-2 pb-4 border-b">
							<h4 className="text-sm font-semibold">Comment</h4>
							<p className="text-sm text-muted-foreground">{selectedComment}</p>
							{/* TODO: Add shift configuration form here */}
						</div>

						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<h4 className="text-sm font-semibold">Add Shift</h4>
								<span
									className={cn(
										"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
										dialogDayAvailability === "not_available"
											? "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
											: "border-border bg-muted text-muted-foreground",
									)}
								>
									<span className={cn("h-1.5 w-1.5 rounded-full", dialogAvailabilityStyle.dot)} />
									{dialogAvailabilityStyle.label}
								</span>
							</div>

							{isSelectedDayUnavailable ? (
								<div className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
									This user is not available on this day, so no shift can be assigned.
								</div>
							) : (
								<>
									<div className="space-y-1">
										<label
											htmlFor="shift-store"
											className="text-xs font-medium text-muted-foreground"
										>
											Store
										</label>
										<Select
											value={selectedStoreId.toString()}
											onValueChange={(val) => setSelectedStoreId(Number(val))}
										>
											<SelectTrigger id="shift-store" className="w-full">
												<SelectValue placeholder="Choose store" />
											</SelectTrigger>
											<SelectContent>
												{stores.map((store) => (
													<SelectItem key={store.id} value={store.id.toString()}>
														{store.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									{/* <p className="text-sm text-muted-foreground">
                  Configure shift details for {selectedDay ? format(selectedDay, "EEEE") : ""}.
                </p> */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
										<div className="space-y-1">
											<label className="text-xs font-medium text-muted-foreground">
												Start hour
											</label>
											<Select value={shiftStart} onValueChange={setShiftStart}>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Quick pick" />
												</SelectTrigger>
												<SelectContent>
													{SHIFT_TIME_OPTIONS.map((time) => (
														<SelectItem key={`start-${time}`} value={time}>
															{time}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-1">
											<label className="text-xs font-medium text-muted-foreground">End hour</label>
											<Select value={shiftEnd} onValueChange={setShiftEnd}>
												<SelectTrigger className="w-full">
													<SelectValue placeholder="Quick pick" />
												</SelectTrigger>
												<SelectContent>
													{SHIFT_TIME_OPTIONS.map((time) => (
														<SelectItem key={`end-${time}`} value={time}>
															{time}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
									{effectiveIsInvalid ? (
										<p className="text-xs text-red-600 dark:text-red-400">
											End hour must be later than start hour.
										</p>
									) : null}
									{customShiftStart && !validateTimeFormat(customShiftStart) ? (
										<p className="text-xs text-red-600 dark:text-red-400">
											Start time must be in HH:MM format.
										</p>
									) : null}
									{customShiftEnd && !validateTimeFormat(customShiftEnd) ? (
										<p className="text-xs text-red-600 dark:text-red-400">
											End time must be in HH:MM format.
										</p>
									) : null}
									{selectedStoreId === 0 ? (
										<p className="text-xs text-red-600 dark:text-red-400">Please choose a store.</p>
									) : null}
									{/* {selectedStoreName ? (
                  <p className="text-xs text-muted-foreground">Selected store: {selectedStoreName}</p>
                ) : null} */}
									{/* <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      {currentWeek != "null" ? currentWeek : "Choose week"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Select Week</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={currentWeek} onValueChange={setCurrentWeek}>
                        {weeks.map((week) => (
                          <DropdownMenuRadioItem key={week.id} value={week.week_label}>
                            {week.week_label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu> */}
								</>
							)}
						</div>
					</div>

					<div className="flex gap-2 justify-end">
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleSaveShift}
							disabled={isSelectedDayUnavailable || effectiveIsInvalid || selectedStoreId === 0}
						>
							Save Shift
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={clearDialog} onOpenChange={setClearDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Clear all shifts?</DialogTitle>
						<DialogDescription>
							This will delete all assigned shifts. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="flex gap-2 justify-end">
						<Button variant="outline" onClick={() => setClearDialog(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleConfirmClear}>
							Clear All
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

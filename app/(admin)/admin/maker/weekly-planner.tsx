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
import { Input } from "@/components/ui/input";
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
} from "@/action/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
	Plus,
	Save,
} from "lucide-react";

import { Availability, User, Week, DayAvailability, Store, ShiftAssignment } from "@/types";

import {
	AVAILABILITY_STYLES,
	DAY_KEYS,
	getWeekStartDate,
	getAvailabilityForDate,
} from "@/help_functions";

interface WeeklyPlannerProps {
	file: File | null;
}

// const SHIFTS_STORAGE_KEY = "weekly-planner-assigned-shifts-v1";

const SHIFT_TIME_OPTIONS = Array.from({ length: 53 }, (_, index) => {
	const totalMinutes = 9 * 60 + index * 15;
	const hour = Math.floor(totalMinutes / 60);
	const minute = totalMinutes % 60;
	return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
});

export default function WeeklyPlanner({ file }: WeeklyPlannerProps) {
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
	const [selectedStoreId, setSelectedStoreId] = useState<string>("");
	const [shiftStart, setShiftStart] = useState("09:00");
	const [shiftEnd, setShiftEnd] = useState("17:00");
	const [customShiftStart, setCustomShiftStart] = useState("");
	const [customShiftEnd, setCustomShiftEnd] = useState("");
	const [assignedShifts, setAssignedShifts] = useState<
		Record<string, Record<string, ShiftAssignment>>
	>({});
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
		const existingShift = student?.user.email
			? assignedShifts[student.user.email]?.[dayKey]
			: undefined;

		setSelectedStoreId(existingShift?.storeId ?? stores[0]?.id.toString() ?? "");
		setShiftStart(existingShift?.start ?? "09:00");
		setShiftEnd(existingShift?.end ?? "17:00");
		setCustomShiftStart("");
		setCustomShiftEnd("");
		setSelectedStudent(student);
		setSelectedDay(day);
		setDialogOpen(true);
	};

	const getShiftDurationHours = (start: string, end: string) => {
		const [startHour, startMinute] = start.split(":").map(Number);
		const [endHour, endMinute] = end.split(":").map(Number);
		const startTotalMinutes = startHour * 60 + startMinute;
		const endTotalMinutes = endHour * 60 + endMinute;
		return (endTotalMinutes - startTotalMinutes) / 60;
	};

	const getAssignedHoursForStudent = (email: string, weekDays: Date[]) => {
		const studentShifts = assignedShifts[email];
		if (!studentShifts) return 0;

		return weekDays.reduce((sum, day) => {
			const dayKey = format(day, "yyyy-MM-dd");
			return sum + (studentShifts[dayKey]?.hours ?? 0);
		}, 0);
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

		setAssignedShifts((prev) => ({
			...prev,
			[email]: {
				...(prev[email] ?? {}),
				[dayKey]: {
					storeId: selectedStoreId,
					start: effectiveStart,
					end: effectiveEnd,
					hours,
				},
			},
		}));

		setDialogOpen(false);
	};

	const hasAssignedShifts = Object.values(assignedShifts).some(
		(studentShifts) => Object.keys(studentShifts).length > 0,
	);

	const handleSaveAllShifts = async () => {
		if (!hasAssignedShifts) {
			setSaveMessage("No shifts to save yet.");
			return;
		}

		console.log("These are the shifts for: ", assignedShifts);

		try {
			const result = await insertShift(assignedShifts);
			setSaveMessage(`Saved ${result.length} user shifts`);
		} catch {
			setSaveMessage("Could not save shifts... Try again");
		}

		// try {
		//   localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(assignedShifts));
		//   setSaveMessage(`Saved ${Object.keys(assignedShifts).length} student schedules.`);
		// } catch {
		//   setSaveMessage("Could not save shifts in this browser.");
		// }
	};

	const handleClear = () => {
		setClearDialog(true);
	};

	const handleConfirmClear = () => {
		setAssignedShifts({});
		setSaveMessage("");
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
				// Sort by year first, then by week_number
				const sorted = data.sort((a, b) => {
					if (a.year !== b.year) {
						return a.year - b.year;
					}
					return a.week_number - b.week_number;
				});
				setWeeks(sorted);
				setAvailabilityData(availabilities);
				setStores(stores);
				setSelectedStoreId((current) => current || stores[0]?.id.toString() || "");
				setUsers(users);
			} finally {
				setIsLoadingWeeks(false);
			}
		};
		fetchData();
	}, [file, user]);

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
	const isShiftRangeInvalid = shiftEnd <= shiftStart;

	if (!user) {
		return <div className="text-sm text-muted-foreground">No user found.</div>;
	}

	return (
		<div>
			<div className="pb-4 flex flex-wrap justify-between gap-2">
				{isLoadingWeeks ? (
					<div className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
						<RefreshCw className="h-4 w-4 animate-spin" />
						Loading weeks...
					</div>
				) : weeks.length > 0 ? (
					<div className="grid grid-cols-2 gap-2 items-center">
						<DropdownMenu>
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
						</DropdownMenu>
						{saveMessage ? <p className="text-xs text-muted-foreground">{saveMessage}</p> : null}
					</div>
				) : (
					<div>No available weeks</div>
				)}

				<div className="grid grid-cols-2 gap-3">
					<Button variant="secondary" onClick={handleClear} disabled={!hasAssignedShifts}>
						Clear
					</Button>
					<Button variant="default" onClick={handleSaveAllShifts} disabled={!hasAssignedShifts}>
						<Save className="mr-2 h-4 w-4" />
						Save All Shifts
					</Button>
				</div>
			</div>
			{currentWeek != "null" ? (
				<Card>
					{/* Week Navigation */}
					<CardHeader className="flex flex-row items-center justify-center space-y-0 pb-4">
						{/* <Button
						variant="outline"
						size="icon"
						onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button> */}
						<CardTitle className="text-lg">
							{currentWeek}
							{/* ({format(currentWeekStart, "MMM d")} –{" "}
              {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}) */}
						</CardTitle>
						{/* <Button
						variant="outline"
						size="icon"
						onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
					>
						<ChevronRight className="h-4 w-4" />
					</Button> */}
					</CardHeader>

					<CardContent className="p-0 overflow-hidden">
						{(() => {
							const { weekDays, weekStudents } = getWeeklyAvailability(currentWeek);

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
																<div className="min-w-0 flex-1">
																	<p className="text-xs sm:text-sm font-medium truncate">
																		{entry.user.first_name}
																	</p>
																	{/* <p className=""></p> */}
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
																		// const partOfDay = firstDayData?.availability;
																		return (
																			<div>
																				{/* <p>{partOfDay}</p> */}
																				<p className="text-[9px] sm:text-xs text-muted-foreground truncate line-clamp-1">
																					assigned {assignedHours}h
																					{targetHours != null && targetHours > 0
																						? ` / ${targetHours}h target`
																						: ""}
																				</p>
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
															const savedShift = assignedShifts[entry.user.email]?.[dayKey];
															const savedStoreName = savedShift
																? stores.find((store) => store.id.toString() === savedShift.storeId)
																		?.name
																: undefined;
															return (
																<td
																	key={dayKey}
																	onClick={() => handleCellClick(entry, day)}
																	className="relative border-b border-r p-1 sm:p-2 text-center h-16 sm:h-20 w-20 sm:w-28 flex-shrink-0 cursor-pointer hover:bg-muted/50 transition-colors"
																>
																	{isUnavailableDay ? (
																		<div className="pointer-events-none absolute inset-0 bg-slate-300/35 dark:bg-slate-700/45" />
																	) : null}
																	{availabilityStyle ? (
																		<div
																			className="absolute left-1 top-1 z-10 inline-flex items-center gap-1 rounded-full bg-background/70 px-1.5 py-0.5"
																			title={availabilityStyle.label}
																		>
																			<span
																				className={cn(
																					"h-1.5 w-1.5 rounded-full opacity-80",
																					availabilityStyle.dot,
																				)}
																			/>
																			<span className="text-[9px] leading-none text-muted-foreground">
																				{availabilityStyle.short}
																			</span>
																		</div>
																	) : null}
																	{savedShift ? (
																		<div className="relative z-10 flex h-full flex-col items-center justify-center gap-0.5">
																			<span className="text-[10px] sm:text-xs font-medium">
																				{savedShift.start} - {savedShift.end}
																			</span>
																			<span className="text-[9px] sm:text-[11px] text-muted-foreground">
																				{savedShift.hours}h
																			</span>
																			{savedStoreName ? (
																				<span className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-1">
																					{savedStoreName}
																				</span>
																			) : null}
																		</div>
																	) : (
																		<span className="relative z-10 text-[9px] sm:text-xs text-muted-foreground">
																			+
																		</span>
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
										<Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
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
									{!selectedStoreId ? (
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
							disabled={isSelectedDayUnavailable || effectiveIsInvalid || !selectedStoreId}
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

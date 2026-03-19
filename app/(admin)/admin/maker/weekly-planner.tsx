"use client";

// import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/help_functions";
import { cn } from "@/lib/utils";
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
import { getAllWeeks, getAllAvailability, getAllUsers } from "@/action/supabase";
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
} from "lucide-react";

import { Availability, User, Week, DayAvailability } from "@/types";

import {
	AVAILABILITY_STYLES,
	DAY_KEYS,
	getWeekStartDate,
	getAvailabilityForDate,
} from "@/help_functions";

interface WeeklyPlannerProps {
	file: File | null;
}

export default function WeeklyPlanner({ file }: WeeklyPlannerProps) {
	const [currentWeek, setCurrentWeek] = useState<string>("null");
	const [weeks, setWeeks] = useState<Week[]>([]);
	const [availabilityData, setAvailabilityData] = useState<Availability[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedStudent, setSelectedStudent] = useState<{
		user: User;
		days: Record<string, { availability: DayAvailability; hours: number; week_id: string }>;
	} | null>(null);
	const [selectedDay, setSelectedDay] = useState<Date | null>(null);
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
		setSelectedStudent(student);
		setSelectedDay(day);
		setDialogOpen(true);
	};

	useEffect(() => {
		const fetchData = async () => {
			const data = await getAllWeeks();
			const availabilities = await getAllAvailability();
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
			setUsers(users);
		};
		fetchData();
	}, [file]);

	// Update currentWeekStart when currentWeek changes
	// useEffect(() => {
	// 	if (currentWeek !== "null" && weeks.length > 0) {
	// 		const matchingWeek = weeks.find((week) => week.week_label === currentWeek);
	// 		if (matchingWeek) {
	// 			const weekStart = getWeekStartDate(matchingWeek.week_number, matchingWeek.year);
	// 			setCurrentWeekStart(weekStart);
	// 		}
	// 	}
	// }, [currentWeek, weeks]);
	return (
		<div>
			<div className="pb-4">
				{weeks ? (
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
				) : (
					<div>No available weeks</div>
				)}
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
																		// const weekId = firstDayData?.week_id;
																		// const comment = weekId && comments[entry.user.email]?.[weekId];
																		const hours = firstDayData?.hours;
																		return (
																			<p className="text-[9px] sm:text-xs text-muted-foreground truncate line-clamp-1">
																				{/* {comment}
																				{comment && hours != null && hours > 0 && " • "} */}
																				{hours != null && hours > 0 && `${hours}h`}
																			</p>
																		);
																	})()}
																</div>
															</div>
														</td>
														{weekDays.map((day) => {
															const dayKey = format(day, "yyyy-MM-dd");
															return (
																<td
																	key={dayKey}
																	onClick={() => handleCellClick(entry, day)}
																	className="border-b border-r p-1 sm:p-2 text-center h-16 sm:h-20 w-20 sm:w-28 flex-shrink-0 cursor-pointer hover:bg-muted/50 transition-colors"
																>
																	<span className="text-[9px] sm:text-xs text-muted-foreground">
																		+
																	</span>
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
										{/* <tbody>
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
																		<p className="text-[9px] sm:text-xs text-muted-foreground truncate line-clamp-1">
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
																		className={cn("text-[9px] sm:text-xs font-medium", style.color)}
																	>
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
									</tbody> */}
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
							Add or edit shift information for this student on this day
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

						<div className="space-y-2">
							<h4 className="text-sm font-semibold">Add Shift</h4>
							<p className="text-sm text-muted-foreground">
								Configure shift details for {selectedDay ? format(selectedDay, "EEEE") : ""}.
							</p>
							{/* TODO: Add shift configuration form here */}
						</div>
					</div>

					<div className="flex gap-2 justify-end">
						<Button variant="outline" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button>Save Shift</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

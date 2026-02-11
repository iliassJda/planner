"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/context/user-context";
import {
	Calendar,
	CheckCircle2,
	Clock,
	Send,
	CalendarDays,
	Sun,
	Sunset,
	Calendar as CalendarIcon,
	X,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Week, Availability, DayAvailability } from "@/types";
// import AdminSkeleton from "@/components/admin-skeleton";
import UserSkeleton from "@/components/user-skeleton";
import { getAllWeeks, insertAvailability, getAvailabilityByEmail } from "@/action/supabase";
import { useRouter } from "next/navigation";

// Mock data - Replace with actual data fetching
// const mockActiveWeeks: Week[] = [
// 	{ id: "2026-5", week_number: 5, year: 2026, week_label: "Week 5", is_active: true },
// 	{ id: "2026-6", week_number: 6, year: 2026, week_label: "Week 6", is_active: true },
// 	{ id: "2026-7", week_number: 7, year: 2026, week_label: "Week 7", is_active: true },
// ];

const DAYS = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
] as const;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const AVAILABILITY_OPTIONS = [
	{
		value: "not_available" as const,
		label: "Not Available",
		icon: X,
		color: "text-red-600",
		bg: "bg-red-50 dark:bg-red-950/30",
		border: "border-red-200 dark:border-red-800",
	},
	{
		value: "morning" as const,
		label: "Morning",
		icon: Sun,
		color: "text-amber-600",
		bg: "bg-amber-50 dark:bg-amber-950/30",
		border: "border-amber-200 dark:border-amber-800",
	},
	{
		value: "afternoon" as const,
		label: "Afternoon",
		icon: Sunset,
		color: "text-orange-600",
		bg: "bg-orange-50 dark:bg-orange-950/30",
		border: "border-orange-200 dark:border-orange-800",
	},
	{
		value: "whole_day" as const,
		label: "Whole Day",
		icon: CalendarIcon,
		color: "text-green-600",
		bg: "bg-green-50 dark:bg-green-950/30",
		border: "border-green-200 dark:border-green-800",
	},
];

export default function Dashboard() {
	const user = useUser();
	const router = useRouter();
	const [availabilities, setAvailabilities] = useState<
		Record<string, Record<string, DayAvailability>>
	>({});
	const [activeWeeks, setActiveWeeks] = useState<Week[]>([]);
	const [submittedWeeks, setSubmittedWeeks] = useState<Set<string>>(new Set());
	const [currentAvailability, setCurrentAvailability] = useState<Availability[]>([]);
	const [submitting, setSubmitting] = useState<string | null>(null);
	const [editingWeek, setEditingWeek] = useState<string | null>(null);
	const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);

	const fetchData = async () => {
		const availabilityData = await getAvailabilityByEmail(user?.email || "");
		const activeWeeksData: Week[] = (await getAllWeeks())
			.filter((week) => !availabilityData.some((a) => a.week_id === week.id))
			.sort((a, b) => a.week_number - b.week_number);

		setCurrentAvailability(availabilityData);
		setActiveWeeks(activeWeeksData);
		setLoading(false);
	};

	useEffect(() => {
		fetchData();
	}, [user?.email]);

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase();
	};

	const currentDate = new Date();
	const formattedDate = currentDate.toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const getWeekNumber = (date: Date) => {
		const startOfYear = new Date(date.getFullYear(), 0, 1);
		const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
		return Math.ceil((days + startOfYear.getDay() + 1) / 7);
	};

	const handleDayToggle = (weekId: string, day: string, availability: DayAvailability) => {
		setAvailabilities((prev) => ({
			...prev,
			[weekId]: {
				...(prev[weekId] || {}),
				[day]: availability,
			},
		}));
	};

	const handleSubmitAvailability = async (weekId: string) => {
		setSubmitting(weekId);
		try {
			const weekAvailability = availabilities[weekId] || {};
			console.log("Week Availability:", weekAvailability);
			const availability: Availability = {
				email: user?.email || "",
				week_id: weekId,
				week_number: parseInt(weekId.split("-")[1], 10),
				monday: weekAvailability.monday || "not_available",
				tuesday: weekAvailability.tuesday || "not_available",
				wednesday: weekAvailability.wednesday || "not_available",
				thursday: weekAvailability.thursday || "not_available",
				friday: weekAvailability.friday || "not_available",
				saturday: weekAvailability.saturday || "not_available",
				sunday: weekAvailability.sunday || "not_available",
			};

			await insertAvailability(availability);

			// Refetch data to update both completed and active weeks
			await fetchData();

			setSubmittedWeeks((prev) => new Set([...prev, weekId]));
			toast.success(`Availability submitted for Week ${weekId.split("-")[1]}`);
		} catch (error) {
			console.error("Error submitting availability:", error);
			toast.error("Failed to submit availability");
		} finally {
			setSubmitting(null);
		}
	};

	const getSelectedDaysCount = (weekId: string) => {
		const weekAvailability = availabilities[weekId] || {};
		// console.log(
		// 	"Calculating selected days for weekId:",
		// 	weekId,
		// 	"with availability:",
		// 	availabilities,
		// );
		return Object.values(weekAvailability).filter(
			(availability) => availability !== "not_available",
		).length;
	};

	const getAvailabilitySummary = (weekId: string) => {
		const weekAvailability = availabilities[weekId] || {};
		const summary: Record<DayAvailability, number> = {
			not_available: 0,
			morning: 0,
			afternoon: 0,
			whole_day: 0,
		};

		DAYS.forEach((day) => {
			const availability = weekAvailability[day] || "not_available";
			summary[availability]++;
		});

		return summary;
	};

	const toggleWeekExpansion = (weekId: string) => {
		setExpandedWeeks((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(weekId)) {
				newSet.delete(weekId);
			} else {
				newSet.add(weekId);
			}
			return newSet;
		});
	};

	const getSubmittedWeekAvailabilityCount = (week: Availability) => {
		return DAYS.filter((day) => week[day] !== "not_available").length;
	};

	const pendingWeeks = activeWeeks.filter((w) => !submittedWeeks.has(w.id));
	// const completedWeeks = activeWeeks.filter((w) => submittedWeeks.has(w.id));
	const completedWeeks = currentAvailability;
	// const completedWeeks =
	console.log("Completed Weeks:", completedWeeks);

	if (loading) {
		return <UserSkeleton />;
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			{/* Welcome Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-4">
					<Avatar className="h-16 w-16">
						<AvatarImage src={user?.image} alt={user?.name} />
						<AvatarFallback className="text-lg">
							{user?.name ? getInitials(user.name) : "U"}
						</AvatarFallback>
					</Avatar>
					<div>
						<h1 className="text-2xl font-bold md:text-3xl">
							Welcome back, {user?.name?.split(" ")[0]}!
						</h1>
						<p className="text-muted-foreground">{formattedDate}</p>
					</div>
				</div>
				<div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
					<Calendar className="h-5 w-5" />
					<span className="font-medium">Week {getWeekNumber(currentDate)}</span>
				</div>
			</div>

			{/* Quick Stats */}
			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardContent className="flex items-center gap-4 pt-6">
						<div className="rounded-lg  p-3 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
							<Clock className="h-6 w-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">{pendingWeeks.length}</p>
							<p className="text-sm text-muted-foreground">Weeks pending</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-4 pt-6">
						<div className="rounded-lg p-3 text-green-600 dark:bg-green-900/30 dark:text-green-400">
							<CheckCircle2 className="h-6 w-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">{completedWeeks.length}</p>
							<p className="text-sm text-muted-foreground">Weeks submitted</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-4 pt-6">
						<div className="rounded-lg p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
							<CalendarDays className="h-6 w-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">{activeWeeks.length + completedWeeks.length}</p>
							<p className="text-sm text-muted-foreground">Total requests</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Availability Cards */}

			<div>
				<h2 className="mb-4 text-xl font-semibold">Submit Your Availability</h2>
				{pendingWeeks.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
							<p className="text-lg font-medium">All caught up!</p>
							<p className="text-muted-foreground">
								You have submitted your availability for all requested weeks.
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{pendingWeeks.map((week) => (
							<Card key={week.id} className="overflow-hidden">
								<CardHeader className="">
									<CardTitle className="flex items-center gap-2">
										<Calendar className="h-5 w-5 text-primary" />
										Week {week.week_number}
									</CardTitle>
									<CardDescription>Year {week.year}</CardDescription>
								</CardHeader>
								<CardContent className="pt-4">
									<p className="mb-6 text-sm text-muted-foreground">
										Select your availability for each day of the week:
									</p>
									<div className="space-y-4">
										{/* Availability Summary */}
										<div className="rounded-lg border bg-muted/30 p-4">
											<div className="flex items-center justify-between mb-3">
												<h4 className="font-medium">Current Availability</h4>
												{/* <Dialog
													open={editingWeek === week.id}
													onOpenChange={(open) => setEditingWeek(open ? week.id : null)}
												>
													<DialogTrigger asChild>
														<Button variant="outline" size="sm">
															Edit Schedule
														</Button>
													</DialogTrigger>
													<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
														<DialogHeader>
															<DialogTitle>Set Availability - Week {week.week_number}</DialogTitle>
															<DialogDescription>
																Select your availability for each day of the week.
															</DialogDescription>
														</DialogHeader>
													</DialogContent>
												</Dialog> */}

												<Dialog
													open={editingWeek === week.id}
													onOpenChange={(open) => setEditingWeek(open ? week.id : null)}
												>
													<DialogTrigger asChild>
														<Button variant="outline" size="sm">
															Edit Schedule
														</Button>
													</DialogTrigger>
													<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
														<DialogHeader>
															<DialogTitle>Set Availability - Week {week.week_number}</DialogTitle>
															<DialogDescription>
																Select your availability for each day of the week.
															</DialogDescription>
														</DialogHeader>
														<div className="space-y-4 mt-4">
															{DAYS.map((day, index) => {
																const currentAvailability =
																	availabilities[week.id]?.[day] || "not_available";
																return (
																	<div key={day} className="border rounded-lg p-4 bg-card">
																		<h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
																			<span className="text-primary">{DAY_LABELS[index]}</span>
																			<span className="text-muted-foreground text-base font-normal">
																				({day.charAt(0).toUpperCase() + day.slice(1)})
																			</span>
																		</h4>
																		<div className="grid gap-2">
																			{AVAILABILITY_OPTIONS.map((option) => {
																				const isSelected = currentAvailability === option.value;
																				const Icon = option.icon;
																				return (
																					<button
																						key={option.value}
																						type="button"
																						onClick={() =>
																							handleDayToggle(week.id, day, option.value)
																						}
																						className={cn(
																							"flex items-center gap-3 p-3 rounded-md border-2 transition-all duration-200 hover:shadow-md w-full text-left",
																							isSelected
																								? `${option.bg} ${option.border} ring-2 ring-offset-2 ring-current ${option.color} shadow-md`
																								: "bg-muted/50 border-muted hover:border-muted-foreground/30",
																						)}
																					>
																						<Icon
																							className={cn(
																								"h-5 w-5 flex-shrink-0",
																								isSelected ? option.color : "text-muted-foreground",
																							)}
																						/>
																						<span
																							className={cn(
																								"font-medium",
																								isSelected ? option.color : "text-muted-foreground",
																							)}
																						>
																							{option.label}
																						</span>
																						{isSelected && (
																							<CheckCircle2
																								className={cn("h-5 w-5 ml-auto", option.color)}
																							/>
																						)}
																					</button>
																				);
																			})}
																		</div>
																	</div>
																);
															})}
														</div>
													</DialogContent>
												</Dialog>
											</div>
											{(() => {
												const summary = getAvailabilitySummary(week.id);
												return (
													<div className="grid grid-cols-1 gap-2 text-sm">
														{summary.morning > 0 && (
															<div className="flex items-center gap-2">
																<Sun className="h-4 w-4 text-amber-600" />
																<span>
																	{summary.morning} morning{summary.morning > 1 ? "s" : ""}
																</span>
															</div>
														)}
														{summary.afternoon > 0 && (
															<div className="flex items-center gap-2">
																<Sunset className="h-4 w-4 text-orange-600" />
																<span>
																	{summary.afternoon} afternoon{summary.afternoon > 1 ? "s" : ""}
																</span>
															</div>
														)}
														{summary.whole_day > 0 && (
															<div className="flex items-center gap-2">
																<CalendarIcon className="h-4 w-4 text-green-600" />
																<span>
																	{summary.whole_day} full day{summary.whole_day > 1 ? "s" : ""}
																</span>
															</div>
														)}
														{getSelectedDaysCount(week.id) === 0 && (
															<div className="flex items-center gap-2 col-span-3">
																<X className="h-4 w-4 text-muted-foreground" />
																<span className="text-muted-foreground">No availability set</span>
															</div>
														)}
													</div>
												);
											})()}
										</div>
									</div>
									<div className="mt-4 flex items-center justify-between">
										<span className="text-sm text-muted-foreground">
											{getSelectedDaysCount(week.id)} days with availability
										</span>
										<Button
											size="sm"
											onClick={() => handleSubmitAvailability(week.id)}
											disabled={submitting === week.id}
										>
											{submitting === week.id ? (
												"Submitting..."
											) : (
												<>
													<Send className="mr-2 h-4 w-4" />
													Submit
												</>
											)}
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Submitted Weeks */}
			{completedWeeks.length > 0 && (
				<div>
					<h2 className="mb-4 text-xl font-semibold">Submitted Availability</h2>
					<div className="grid gap-4">
						{completedWeeks
							.sort((a, b) => a.week_number - b.week_number)
							.map((week) => {
								const isExpanded = expandedWeeks.has(week.week_id);
								const availableDaysCount = getSubmittedWeekAvailabilityCount(week);

								return (
									<Card
										key={week.week_id}
										className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10 hover:bg-green-100/50 dark:hover:bg-green-900/20 transition-colors"
									>
										<CardContent className="p-0">
											<button
												onClick={() => toggleWeekExpansion(week.week_id)}
												className="w-full p-6 text-left  rounded-lg"
											>
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
														<div className="rounded-full dark:bg-green-900 dark:text-green-400 bg-green-100 p-2 text-green-600">
															<CheckCircle2 className="h-5 w-5" />
														</div>
														<div>
															<p className="font-medium text-lg">Week {week.week_number}</p>
															<p className="text-sm text-muted-foreground">
																{availableDaysCount} day{availableDaysCount !== 1 ? "s" : ""}{" "}
																available
															</p>
														</div>
													</div>
													<div className="flex items-center gap-3">
														<span className="rounded-full dark:bg-green-900 dark:text-green-400 bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
															Submitted
														</span>
														{isExpanded ? (
															<ChevronUp className="h-5 w-5 text-muted-foreground" />
														) : (
															<ChevronDown className="h-5 w-5 text-muted-foreground" />
														)}
													</div>
												</div>
											</button>

											{isExpanded && (
												<div className="px-6 pb-6 border-t border-green-200 dark:border-green-800">
													<div className="pt-4">
														<h4 className="font-medium mb-3 text-muted-foreground text-sm">
															Weekly Schedule
														</h4>
														<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
															{DAYS.map((day, index) => {
																const availability = week[day];
																const option = AVAILABILITY_OPTIONS.find(
																	(opt) => opt.value === availability,
																);
																const Icon = option?.icon || X;

																return (
																	<div key={day} className="rounded-lg border bg-card/50 p-3">
																		<div className="text-xs font-medium text-muted-foreground mb-1">
																			{DAY_LABELS[index]}
																		</div>
																		<div
																			className={cn(
																				"flex items-center gap-2",
																				option?.color || "text-muted-foreground",
																			)}
																		>
																			<Icon className="h-4 w-4 flex-shrink-0" />
																			<span className="text-sm font-medium truncate">
																				{option?.label === "Not Available"
																					? "N/A"
																					: option?.label || "N/A"}
																			</span>
																		</div>
																	</div>
																);
															})}
														</div>
													</div>
												</div>
											)}
										</CardContent>
									</Card>
								);
							})}
					</div>
				</div>
			)}
		</div>
	);
}

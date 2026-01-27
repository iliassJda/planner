"use client";
import { useState } from "react";
import { useUser } from "@/context/user-context";
import { Calendar, CheckCircle2, Clock, Send, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Week, Availability } from "@/types";

// Mock data - Replace with actual data fetching
const mockActiveWeeks: Week[] = [
	{ id: "2026-5", week_number: 5, year: 2026, week_label: "Week 5", is_active: true },
	{ id: "2026-6", week_number: 6, year: 2026, week_label: "Week 6", is_active: true },
	{ id: "2026-7", week_number: 7, year: 2026, week_label: "Week 7", is_active: true },
];

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

export default function Dashboard() {
	const user = useUser();
	const [availabilities, setAvailabilities] = useState<Record<string, Record<string, boolean>>>({});
	const [submittedWeeks, setSubmittedWeeks] = useState<Set<string>>(new Set());
	const [submitting, setSubmitting] = useState<string | null>(null);

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

	const handleDayToggle = (weekId: string, day: string, checked: boolean) => {
		setAvailabilities((prev) => ({
			...prev,
			[weekId]: {
				...(prev[weekId] || {}),
				[day]: checked,
			},
		}));
	};

	const handleSubmitAvailability = async (weekId: string) => {
		setSubmitting(weekId);
		try {
			const weekAvailability = availabilities[weekId] || {};
			const availability: Availability = {
				user_email: user?.email || "",
				week_id: weekId,
				monday: weekAvailability.monday || false,
				tuesday: weekAvailability.tuesday || false,
				wednesday: weekAvailability.wednesday || false,
				thursday: weekAvailability.thursday || false,
				friday: weekAvailability.friday || false,
				saturday: weekAvailability.saturday || false,
				sunday: weekAvailability.sunday || false,
			};

			// TODO: Save to Supabase
			console.log("Submitting availability:", availability);
			await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call

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
		return Object.values(weekAvailability).filter(Boolean).length;
	};

	const pendingWeeks = mockActiveWeeks.filter((w) => !submittedWeeks.has(w.id));
	const completedWeeks = mockActiveWeeks.filter((w) => submittedWeeks.has(w.id));

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
							<p className="text-2xl font-bold">{mockActiveWeeks.length}</p>
							<p className="text-sm text-muted-foreground">Total requests</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Availability Cards */}
			{/* <div>
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
								<CardHeader className="bg-muted/50">
									<CardTitle className="flex items-center gap-2">
										<Calendar className="h-5 w-5 text-primary" />
										Week {week.week_number}
									</CardTitle>
									<CardDescription>Year {week.year}</CardDescription>
								</CardHeader>
								<CardContent className="pt-4">
									<p className="mb-4 text-sm text-muted-foreground">
										Select the days you are available:
									</p>
									<div className="grid grid-cols-7 gap-1">
										{DAYS.map((day, index) => {
											const isChecked = availabilities[week.id]?.[day] || false;
											return (
												<div key={day} className="flex flex-col items-center gap-2">
													<span className="text-xs font-medium text-muted-foreground">
														{DAY_LABELS[index]}
													</span>
													<Checkbox
														checked={isChecked}
														onCheckedChange={(checked) =>
															handleDayToggle(week.id, day, checked as boolean)
														}
														className="h-8 w-8"
													/>
												</div>
											);
										})}
									</div>
									<div className="mt-4 flex items-center justify-between">
										<span className="text-sm text-muted-foreground">
											{getSelectedDaysCount(week.id)} days selected
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
			</div> */}

			{/* Submitted Weeks */}
			{completedWeeks.length > 0 && (
				<div>
					<h2 className="mb-4 text-xl font-semibold">Submitted Availability</h2>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{completedWeeks.map((week) => (
							<Card
								key={week.id}
								className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10"
							>
								<CardContent className="flex items-center justify-between pt-6">
									<div className="flex items-center gap-3">
										<div className="rounded-full dark:bg-green-900 dark:text-green-400 bg-green-100 p-2 text-green-600 ">
											<CheckCircle2 className="h-5 w-5" />
										</div>
										<div>
											<p className="font-medium">Week {week.week_number}</p>
											<p className="text-sm text-muted-foreground">
												{getSelectedDaysCount(week.id)} days available
											</p>
										</div>
									</div>
									<span className="rounded-full dark:bg-green-900 dark:text-green-400 bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
										Submitted
									</span>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Users, Check, X, Save, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Week } from "@/types";

import { getAllWeeks, getTotalStudents, upsertWeeks } from "@/action/supabase";
import AdminSkeleton from "@/components/admin-skeleton";

// Get the current week number and year
function getCurrentWeek() {
	const now = new Date();
	const startOfYear = new Date(now.getFullYear(), 0, 1);
	const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
	const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
	return {
		week: Math.min(weekNumber, 53),
		year: now.getFullYear(),
	};
}

// Generate a list of weeks starting from current week
function generateWeeksList(startWeek: number, startYear: number, count: number = 12) {
	const weeks: Week[] = [];
	const delta = 4;
	let currentWeek = startWeek + delta;
	let currentYear = startYear;

	for (let i = 0; i < count; i++) {
		weeks.push({
			week_number: currentWeek,
			year: currentYear,
			week_label: `Week ${currentWeek}`,
			id: `${currentYear}-${currentWeek}`,
		} as Week);

		currentWeek++;
		if (currentWeek > 53) {
			currentWeek = 1;
			currentYear++;
		}
	}

	return weeks;
}

// Get the date range for a week
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

export default function AdminPage() {
	const [selectedWeeks, setSelectedWeeks] = useState<Set<string>>(new Set());
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);
	const [totalStudents, setTotalStudents] = useState<number | null>(null);
	const [weeks, setWeeks] = useState<Week[]>([]);

	useEffect(() => {
		async function fetchData() {
			const count = await getTotalStudents();
			const weeks = await getAllWeeks();
			// console.log("Fetched weeks:", weeks);
			setTotalStudents(count);
			setWeeks(weeks);
			setLoading(false);
		}
		fetchData();
	}, []);

	const current = getCurrentWeek();
	const weeksList = generateWeeksList(current.week, current.year).filter(
		(week) => !weeks.some((w) => w.id === week.id),
	);

	function handleWeekToggle(weekId: string, checked: boolean) {
		const newSelected = new Set(selectedWeeks);
		if (checked) {
			newSelected.add(weekId);
		} else {
			newSelected.delete(weekId);
		}
		setSelectedWeeks(newSelected);
	}

	function handleSelectAll() {
		const allIds = new Set(weeksList.map((w) => w.id));
		setSelectedWeeks(allIds);
	}

	function handleClearAll() {
		setSelectedWeeks(new Set());
	}

	async function handleSaveSelection() {
		setSaving(true);
		try {
			// Get the selected weeks data
			const weeksToSave = weeksList.filter((week) => selectedWeeks.has(week.id));

			// Save to Supabase
			const result = await upsertWeeks(weeksToSave);

			if (result) {
				toast.success(`${selectedWeeks.size} weeks activated for availability collection`);
				// Refresh the weeks list
				const updatedWeeks = await getAllWeeks();
				setWeeks(updatedWeeks);
			} else {
				toast.error("Failed to save week selection");
			}
		} catch (error) {
			console.error("Error saving weeks:", error);
			toast.error("Failed to save week selection");
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return <AdminSkeleton />;
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold md:text-3xl">Admin Dashboard</h1>
				<p className="text-muted-foreground">Manage availability requests for students</p>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardContent className="flex items-center gap-4 pt-6">
						<div className="rounded-lg p-3 ">
							<CalendarDays className="h-6 w-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">{selectedWeeks.size}</p>
							<p className="text-sm text-muted-foreground">Weeks selected</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-4 pt-6">
						<div className="rounded-lg  p-3">
							<Calendar className="h-6 w-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">Week {current.week}</p>
							<p className="text-sm text-muted-foreground">Current week</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-4 pt-6">
						<div className="rounded-lg ">
							<Users className="h-6 w-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">{totalStudents ?? "--"}</p>
							<p className="text-sm text-muted-foreground">Students</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Week Selection */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Select Weeks for Availability
					</CardTitle>
					<CardDescription>
						Choose which weeks students should submit their availability for.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Action Buttons */}
					<div className="flex flex-wrap items-center gap-3">
						<Button variant="outline" size="sm" onClick={handleSelectAll}>
							<Check className="mr-2 h-4 w-4" />
							Select All
						</Button>
						<Button variant="outline" size="sm" onClick={handleClearAll}>
							<X className="mr-2 h-4 w-4" />
							Clear All
						</Button>
						<div className="flex-1" />
						<Button onClick={handleSaveSelection} disabled={saving || selectedWeeks.size === 0}>
							{saving ? (
								"Saving..."
							) : (
								<>
									<Save className="mr-2 h-4 w-4" />
									Save Selection
								</>
							)}
						</Button>
					</div>

					{/* Week Grid */}
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{weeksList.map((week, index) => {
							const isSelected = selectedWeeks.has(week.id);
							const isCurrent = index === 0;

							return (
								<div
									key={week.id}
									className={`flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
										isSelected ? "border-primary bg-primary/5" : ""
									} ${isCurrent ? "ring-2 ring-blue-200 ring-offset-2" : ""}`}
								>
									<Checkbox
										id={week.id}
										checked={isSelected}
										onCheckedChange={(checked) => handleWeekToggle(week.id, checked as boolean)}
									/>
									<label htmlFor={week.id} className="flex-1 cursor-pointer">
										<div className="flex items-center gap-2">
											<span className="font-medium">{week.week_label}</span>
											{/* {isCurrent && (
												<span className="rounded px-2 py-0.5 text-xs font-medium">Current</span>
											)} */}
										</div>
										<p className="text-sm text-muted-foreground">
											{getWeekDateRange(week.week_number, week.year)}
										</p>
									</label>
								</div>
							);
						})}
					</div>

					{/* Selected Summary */}
					{selectedWeeks.size > 0 && (
						<div className="rounded-lg bg-muted p-4">
							<p className="mb-2 text-sm font-medium">Selected weeks ({selectedWeeks.size}):</p>
							<div className="flex flex-wrap gap-2">
								{Array.from(selectedWeeks)
									.sort()
									.map((weekId) => {
										const week = weeksList.find((w) => w.id === weekId);
										return week ? (
											<span
												key={weekId}
												className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
											>
												Week {week.week_number}
											</span>
										) : null;
									})}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

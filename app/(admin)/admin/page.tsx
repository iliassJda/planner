"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Users, Check, X, Save, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Week } from "@/types";
import { getWeekDateRange } from "@/help_functions";

import { getAllWeeks, getTotalStudents, upsertWeeks, deleteWeek } from "@/action/supabase";
import AdminSkeleton from "@/components/admin-skeleton";

// Get the current week number and year
function getCurrentWeek() {
	const now = new Date();
	const startOfYear = new Date(now.getFullYear(), 0, 1);
	const pastDaysOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
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

export default function AdminPage() {
	const [selectedWeeks, setSelectedWeeks] = useState<Set<string>>(new Set());
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);
	const [totalStudents, setTotalStudents] = useState<number | null>(null);
	const [weeks, setWeeks] = useState<Week[]>([]);
	const [deletingWeek, setDeletingWeek] = useState<string | null>(null);
	const [confirmDeleteWeek, setConfirmDeleteWeek] = useState<{ id: string; number: number } | null>(
		null,
	);

	const fetchData = async () => {
		const count = await getTotalStudents();
		const weeks = await getAllWeeks();
		setTotalStudents(count);
		setWeeks(weeks);
		setLoading(false);
	};

	useEffect(() => {
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
				await fetchData();
				// Clear selection
				setSelectedWeeks(new Set());
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

	function handleDeleteWeekClick(weekId: string, weekNumber: number) {
		setConfirmDeleteWeek({ id: weekId, number: weekNumber });
	}

	async function handleConfirmDelete() {
		if (!confirmDeleteWeek) return;

		setDeletingWeek(confirmDeleteWeek.id);
		setConfirmDeleteWeek(null);
		try {
			const result = await deleteWeek(confirmDeleteWeek.id);
			if (result) {
				toast.success(`Week ${confirmDeleteWeek.number} removed successfully`);
				await fetchData();
			} else {
				toast.error("Failed to remove week");
			}
		} catch (error) {
			console.error("Error deleting week:", error);
			toast.error("Failed to remove week");
		} finally {
			setDeletingWeek(null);
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
							<p className="text-2xl font-bold">{weeks.length}</p>
							<p className="text-sm text-muted-foreground">Active weeks</p>
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

			{weeks.length > 0 && (
				<div>
					<h2 className="mb-4 text-xl font-semibold">Active Weeks</h2>
					<div className="grid gap-4">
						{weeks
							.sort((a, b) => a.week_number - b.week_number)
							.map((week) => {
								return (
									<Card
										key={week.id}
										className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-900/10 transition-colors"
									>
										<CardContent className="p-6">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<div className="rounded-full bg-blue-100 dark:bg-blue-900 p-2 text-blue-600 dark:text-blue-400">
														<Calendar className="h-5 w-5" />
													</div>
													<div>
														<p className="font-medium text-lg">Week {week.week_number}</p>
														<p className="text-sm text-muted-foreground">
															{getWeekDateRange(week.week_number, week.year)} • Year {week.year}
														</p>
													</div>
												</div>
												<div className="flex items-center gap-3">
													<span className="rounded-full bg-blue-100 dark:bg-blue-900 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
														Active
													</span>
													<Button
														variant="outline"
														size="sm"
														className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:border-red-800 dark:hover:bg-red-900/20"
														onClick={() => handleDeleteWeekClick(week.id, week.week_number)}
														disabled={deletingWeek === week.id}
													>
														{deletingWeek === week.id ? (
															"Removing..."
														) : (
															<>
																<X className="mr-2 h-4 w-4" />
																Remove
															</>
														)}
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
					</div>
				</div>
			)}

			{/* Confirmation Dialog */}
			<Dialog open={!!confirmDeleteWeek} onOpenChange={() => setConfirmDeleteWeek(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Week Removal</DialogTitle>
						<DialogDescription>
							Are you sure you want to remove Week {confirmDeleteWeek?.number}? This action will:
						</DialogDescription>
						<DialogDescription>
							{/* Are you sure you want to remove Week {confirmDeleteWeek?.number}? This action will: */}
							<ul className="list-disc list-inside mt-2 ml-2 space-y-1">
								<li>Remove the week from availability collection</li>
								<li>Delete all student submissions for this week</li>
								<li>This action cannot be undone</li>
							</ul>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmDeleteWeek(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleConfirmDelete} disabled={!!deletingWeek}>
							{deletingWeek ? "Removing..." : "Remove Week"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

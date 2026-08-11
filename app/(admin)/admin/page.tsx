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

import {
	getAllWeeks,
	getTotalStudents,
	upsertWeeks,
	deleteWeek,
	deactivateWeek,
	activateWeek,
} from "@/action/supabase";
import AdminSkeleton from "@/components/admin-skeleton";

// Get the current week number and year
function getCurrentWeek() {
	const now = new Date();
	const startOfYear = new Date(now.getFullYear(), 0, 1);
	const pastDaysOfYear = Math.floor(
		(now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
	);
	const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
	return {
		week: Math.min(weekNumber, 53),
		year: now.getFullYear(),
	};
}

// Generate a list of weeks starting from current week
function generateWeeksList(startWeek: number, startYear: number, count: number = 12) {
	const weeks: Week[] = [];
	// const delta = 4;
	let currentWeek = startWeek;
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
	// console.log("Generated weeks list:", weeks);
	return weeks;
}

// Get the date range for a week

export default function AdminPage() {
	const [selectedWeeks, setSelectedWeeks] = useState<Set<string>>(new Set());
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);
	const [totalStudents, setTotalStudents] = useState<number | null>(null);
	const [weeks, setWeeks] = useState<Week[]>([]);
	const [deactiveWeek, setDeactiveWeek] = useState<string | null>(null);
	const [activatingWeekId, setActivatingWeekId] = useState<string | null>(null);
	const [deletingWeek, setDeletingWeek] = useState<string | null>(null);
	const [confirmDeactivateWeek, setConfirmDeactivateWeek] = useState<{
		id: string;
		number: number;
	} | null>(null);
	const [confirmActivateWeek, setConfirmActivateWeek] = useState<{
		id: string;
		number: number;
	} | null>(null);
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

	// Separate active and deactivated weeks
	const activeWeeks = weeks.filter((w) => w.is_active !== false);
	const deactivatedWeeks = weeks.filter((w) => w.is_active === false);

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

	function handleDeactivateWeekClick(weekId: string, weekNumber: number) {
		setConfirmDeactivateWeek({ id: weekId, number: weekNumber });
	}

	function handleActivateWeekClick(weekId: string, weekNumber: number) {
		setConfirmActivateWeek({ id: weekId, number: weekNumber });
	}

	function handleDeleteWeekClick(weekId: string, weekNumber: number) {
		setConfirmDeleteWeek({ id: weekId, number: weekNumber });
	}

	async function handleConfirmActivateWeek() {
		if (!confirmActivateWeek) return;

		setActivatingWeekId(confirmActivateWeek.id);
		setConfirmActivateWeek(null);
		try {
			const result = await activateWeek(confirmActivateWeek.id);
			if (result) {
				toast.success(`Week ${confirmActivateWeek.number} activated successfully`);
				await fetchData();
			} else {
				toast.error("Failed to activate week");
			}
		} catch (error) {
			console.error("Error activating week:", error);
			toast.error("Failed to activate week");
		} finally {
			setActivatingWeekId(null);
		}
	}

	async function handleConfirmDeactivate() {
		if (!confirmDeactivateWeek) return;

		setDeactiveWeek(confirmDeactivateWeek.id);
		setConfirmDeactivateWeek(null);
		try {
			const result = await deactivateWeek(confirmDeactivateWeek.id);
			if (result) {
				toast.success(`Week ${confirmDeactivateWeek.number} deactivated successfully`);
				await fetchData();
			} else {
				toast.error("Failed to deactivate week");
			}
		} catch (error) {
			console.error("Error deactivating week:", error);
			toast.error("Failed to deactivate week");
		} finally {
			setDeactiveWeek(null);
		}
	}

	async function handleConfirmDelete() {
		if (!confirmDeleteWeek) return;

		setDeletingWeek(confirmDeleteWeek.id);
		setConfirmDeleteWeek(null);
		try {
			const result = await deleteWeek(confirmDeleteWeek.id);
			if (result) {
				toast.success(`Week ${confirmDeleteWeek.number} deleted successfully`);
				await fetchData();
			} else {
				toast.error("Failed to delete week");
			}
		} catch (error) {
			console.error("Error deleting week:", error);
			toast.error("Failed to delete week");
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
							<p className="text-2xl font-bold">{activeWeeks.length}</p>
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

			{activeWeeks.length > 0 && (
				<div>
					<h2 className="mb-4 text-xl font-semibold">Active Weeks</h2>
					<div className="grid gap-4">
						{activeWeeks
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
														// className="text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/20"
														onClick={() => handleDeactivateWeekClick(week.id, week.week_number)}
														disabled={deactiveWeek === week.id}
													>
														{deactiveWeek === week.id ? (
															"Deactivating..."
														) : (
															<>
																<X className="mr-2 h-4 w-4" />
																Deactivate
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

			{deactivatedWeeks.length > 0 && (
				<div>
					<h2 className="mb-4 text-xl font-semibold">Deactivated Weeks</h2>
					<div className="grid gap-4">
						{deactivatedWeeks
							.sort((a, b) => a.week_number - b.week_number)
							.map((week) => {
								return (
									<Card
										key={week.id}
										className="border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/10 transition-colors"
									>
										<CardContent className="p-6">
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<div className="rounded-full bg-gray-100 dark:bg-gray-900 p-2 text-gray-600 dark:text-gray-400">
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
													<span className="rounded-full bg-gray-100 dark:bg-gray-900 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-400">
														Deactivated
													</span>
													<Button
														variant="outline"
														size="sm"
														className="bg-blue-100 dark:bg-blue-900 px-3 py-1 text-xs font-medium text-blue-500 dark:text-blue-400"
														onClick={() => handleActivateWeekClick(week.id, week.week_number)}
														disabled={activatingWeekId === week.id}
													>
														{activatingWeekId === week.id ? (
															"Activating..."
														) : (
															<>
																<Check className="mr-2 h-4 w-4" />
																Activate
															</>
														)}
													</Button>
													<Button
														variant="outline"
														size="sm"
														// className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:border-red-800 dark:hover:bg-red-900/20"
														onClick={() => handleDeleteWeekClick(week.id, week.week_number)}
														disabled={deletingWeek === week.id}
													>
														{deletingWeek === week.id ? (
															"Deleting..."
														) : (
															<>
																<X className="mr-2 h-4 w-4" />
																Delete
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

			{/* Confirmation Dialogs */}
			<Dialog open={!!confirmDeactivateWeek} onOpenChange={() => setConfirmDeactivateWeek(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Week Deactivation</DialogTitle>
						<DialogDescription>
							Are you sure you want to deactivate Week {confirmDeactivateWeek?.number}?
						</DialogDescription>
						<DialogDescription className=" text-sm">
							This will prevent students from submitting availability for this week, but all data
							will be preserved.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmDeactivateWeek(null)}>
							Cancel
						</Button>
						<Button onClick={handleConfirmDeactivate} disabled={!!deactiveWeek}>
							{deactiveWeek ? "Deactivating..." : "Deactivate Week"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={!!confirmDeleteWeek} onOpenChange={() => setConfirmDeleteWeek(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Week Deletion</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete Week {confirmDeleteWeek?.number}?
						</DialogDescription>
						<DialogDescription className=" text-sm">
							This will permanently remove the week and all associated student data. This action
							cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmDeleteWeek(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleConfirmDelete} disabled={!!deletingWeek}>
							{deletingWeek ? "Deleting..." : "Delete Week"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={!!confirmActivateWeek} onOpenChange={() => setConfirmActivateWeek(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Week Activation</DialogTitle>
						<DialogDescription>
							Are you sure you want to activate Week {confirmActivateWeek?.number}?
						</DialogDescription>
						<DialogDescription className=" text-sm">
							This will make the week available for students to submit their availability.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmActivateWeek(null)}>
							Cancel
						</Button>
						<Button
							onClick={handleConfirmActivateWeek}
							disabled={!!activatingWeekId}
							className="bg-emerald-600 hover:bg-emerald-700 text-white"
						>
							<Check className="mr-2 h-4 w-4" />
							{activatingWeekId ? "Activating..." : "Activate Week"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

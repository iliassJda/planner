"use client";

import { useState, useEffect } from "react";
import { Calendar, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Week } from "@/types";
import { toast } from "sonner";

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
function generateWeeksList(startWeek: number, startYear: number, count: number = 10) {
	const weeks = [];
	let currentWeek = startWeek;
	let currentYear = startYear;

	for (let i = 0; i < count; i++) {
		weeks.push({
			week_number: currentWeek,
			year: currentYear,
			week_label: `week-${currentWeek.toString().padStart(2, "0")}`,
			id: `${currentYear}-${currentWeek}`,
		});

		currentWeek++;
		if (currentWeek > 53) {
			currentWeek = 1;
			currentYear++;
		}
	}

	return weeks;
}

export default function SetWeeksPage() {
	const [selectedWeeks, setSelectedWeeks] = useState<Set<string>>(new Set());
	const [saving, setSaving] = useState(false);
	const [activeWeeks] = useState<Week[]>([
		{ id: "2025-49", year: 2025, week_number: 49, week_label: "week-49", is_active: true },
	]);

	const current = getCurrentWeek();
	const weeksList = generateWeeksList(current.week, current.year);

	useEffect(() => {
		// Initialize selected weeks with currently active weeks
		const activeIds = new Set(activeWeeks.map((w) => w.id));
		setSelectedWeeks(activeIds);
	}, [activeWeeks]);

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
		toast.success("All weeks selected");
	}

	function handleClearAll() {
		setSelectedWeeks(new Set());
		toast.success("All weeks deselected");
	}

	async function handleSaveSelection() {
		setSaving(true);
		try {
			// Here you would save the selection to your backend
			// const result = await saveWeekSelection(Array.from(selectedWeeks));

			await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
			toast.success(`Saved ${selectedWeeks.size} weeks for availability collection`);
		} catch (error) {
			console.error("Error saving weeks:", error);
			toast.error("Failed to save week selection");
		} finally {
			setSaving(false);
		}
	}

	const isWeekActive = (weekId: string) => {
		return activeWeeks.some((w) => w.id === weekId);
	};

	return (
		<div className="space-y-8 p-6">
			<div className="flex items-center gap-2 ">
				{/* <Calendar className="h-6 w-6" /> */}
				<h1 className="text-2xl font-bold">Week Selection</h1>
			</div>

			{/* Selection Controls */}
			<Card className="mx-auto max-w-4xl">
				<CardHeader className="pb-6">
					<CardTitle>Select Weeks for Availability Collection</CardTitle>
					<CardDescription>
						Choose which weeks students should provide their availability for. List starts from week{" "}
						{current.week} of {current.year} (current week).
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex gap-4 items-center flex-wrap">
						<Button variant="outline" onClick={handleSelectAll} className="px-6">
							<Check className="h-4 w-4 mr-2" />
							Select All
						</Button>
						<Button variant="outline" onClick={handleClearAll} className="px-6">
							<X className="h-4 w-4 mr-2" />
							Clear All
						</Button>
						<div className="flex-1 min-w-0" />
						<div className="text-sm text-muted-foreground whitespace-nowrap">
							{selectedWeeks.size} weeks selected
						</div>
						<Button
							onClick={handleSaveSelection}
							disabled={saving || selectedWeeks.size === 0}
							className="min-w-[140px] px-6"
						>
							{saving ? "Saving..." : "Save Selection"}
						</Button>
					</div>

					{/* Week List */}
					<div className="space-y-1 max-h-96 overflow-y-auto border rounded-lg p-2">
						{weeksList.map((week, index) => {
							const weekId = week.id;
							const isSelected = selectedWeeks.has(weekId);
							const isActive = isWeekActive(weekId);
							const isCurrent = index === 0;

							return (
								<div
									key={weekId}
									className={`flex items-center space-x-4 p-4 m-1 rounded-md hover:bg-muted/50 transition-colors ${
										isCurrent
											? "bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500 ml-0"
											: ""
									}`}
								>
									<Checkbox
										id={weekId}
										checked={isSelected}
										onCheckedChange={(checked) => handleWeekToggle(weekId, checked as boolean)}
										className="mt-1"
									/>
									<label
										htmlFor={weekId}
										className="flex-1 cursor-pointer flex items-center justify-between min-w-0"
									>
										<div className="flex items-center ml-10 gap-4 min-w-0">
											<span className="font-mono font-medium text-base">{week.week_label}</span>
											<span className="text-sm text-muted-foreground whitespace-nowrap">
												Week {week.week_number}, {week.year}
											</span>
											{isCurrent && (
												<span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1 rounded-full whitespace-nowrap">
													Current Week
												</span>
											)}
										</div>
										<div className="flex items-center gap-3 ml-4">
											{isActive && (
												<span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-3 py-1 rounded-full whitespace-nowrap">
													Currently Active
												</span>
											)}
											{isSelected && !isActive && (
												<span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-3 py-1 rounded-full whitespace-nowrap">
													Will Activate
												</span>
											)}
										</div>
									</label>
								</div>
							);
						})}
					</div>

					{selectedWeeks.size > 0 && (
						<div className="mt-6 p-4 bg-muted rounded-lg">
							<h4 className="font-medium text-sm mb-3">Selected weeks:</h4>
							<div className="flex flex-wrap gap-2">
								{Array.from(selectedWeeks)
									.sort()
									.map((weekId) => {
										const week = weeksList.find((w) => w.id === weekId);
										return week ? (
											<span
												key={weekId}
												className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-mono"
											>
												{week.week_label}
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

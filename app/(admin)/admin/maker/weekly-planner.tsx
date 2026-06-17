"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { addDays, format } from "date-fns";
import { RefreshCw, Save, Trash2, CalendarPlus, X, ChevronDown, Palette } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/user-context";

import { Availability, User, Week, DayAvailability, Store, ShiftAssignment, Shift } from "@/types";
import { getInitials, AVAILABILITY_STYLES, getWeekStartDate } from "@/help_functions";

// 9:00 → 22:00 in 15-min steps
const SHIFT_TIME_OPTIONS = Array.from({ length: 53 }, (_, i) => {
	const mins = 9 * 60 + i * 15;
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
});

function shiftHours(start: string, end: string) {
	const [sh, sm] = start.split(":").map(Number);
	const [eh, em] = end.split(":").map(Number);
	return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

function fmt(h: number) {
	if (h <= 0) return "";
	const whole = Math.floor(h);
	const mins = Math.round((h - whole) * 60);
	return mins > 0 ? `${whole}h${mins.toString().padStart(2, "0")}` : `${whole}h`;
}

// Inline CSS colors — avoids Tailwind static-scan issues with dynamic class names.
// bg matches Excel fill colors; text/sub are dark enough to be readable on top.
type StoreColor = { bg: string; text: string; sub: string };

const NAMED_STORE_COLORS: Array<StoreColor & { keywords: string[] }> = [
	{ keywords: ["galerie"], bg: "#fecdd3", text: "#881337", sub: "#be123c" }, // pink
	{ keywords: ["beurre"], bg: "#ddd6fe", text: "#3b0764", sub: "#5b21b6" }, // violet/purple
	{ keywords: ["grand", "place"], bg: "#bbf7d0", text: "#14532d", sub: "#166534" }, // green
	{ keywords: ["atelier"], bg: "#fed7aa", text: "#7c2d12", sub: "#9a3412" }, // orange
	{ keywords: ["mad", "madeleine"], bg: "#bfdbfe", text: "#1e3a8a", sub: "#1d4ed8" }, // blue
	{ keywords: ["louise"], bg: "#bae6fd", text: "#0c4a6e", sub: "#075985" }, // sky
];

const FALLBACK_STORE_COLORS: StoreColor[] = [
	{ bg: "#fef08a", text: "#713f12", sub: "#92400e" }, // yellow
	{ bg: "#fef08a", text: "#713f12", sub: "#92400e" }, // yellow
	{ bg: "#fef08a", text: "#713f12", sub: "#92400e" }, // yellow
	{ bg: "#fef08a", text: "#713f12", sub: "#92400e" }, // yellow
];

type EmployeeRow = {
	user: User;
	days: Record<string, { availability: DayAvailability; hours: number; week_id: string }>;
	targetHours: number | null;
};

export default function WeeklyPlanner() {
	const user = useUser();

	const [currentWeek, setCurrentWeek] = useState("null");
	const [weeks, setWeeks] = useState<Week[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [availabilityData, setAvailabilityData] = useState<Availability[]>([]);
	const [stores, setStores] = useState<Store[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [assignedShifts, setAssignedShifts] = useState<Shift[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [isClearing, setIsClearing] = useState(false);

	// Shift dialog
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedRow, setSelectedRow] = useState<EmployeeRow | null>(null);
	const [selectedDay, setSelectedDay] = useState<Date | null>(null);
	const [selectedStoreId, setSelectedStoreId] = useState(0);
	const [shiftStart, setShiftStart] = useState("09:00");
	const [shiftEnd, setShiftEnd] = useState("17:00");
	const [hasBreak, setHasBreak] = useState(false);

	const [otherStoreName, setOtherStoreName] = useState("");
	const [customStoreNames, setCustomStoreNames] = useState<Record<string, string>>({});

	// Clear dialog
	const [clearDialogOpen, setClearDialogOpen] = useState(false);

	// Color mode
	const [colorMode, setColorMode] = useState(false);
	const getStoreColor = (storeId: number): StoreColor | null => {
		const store = stores.find((s) => s.id === storeId);
		if (!store) return null;
		const name = store.name.toLowerCase();
		const named = NAMED_STORE_COLORS.find((c) => c.keywords.some((kw) => name.includes(kw)));
		if (named) return named;
		const idx = stores.findIndex((s) => s.id === storeId);
		return FALLBACK_STORE_COLORS[idx % FALLBACK_STORE_COLORS.length];
	};

	const otherStore = stores.find((s) => s.name.toLowerCase().includes("other")) ?? null;

	useEffect(() => {
		const fetchData = async () => {
			if (!user) {
				setIsLoading(false);
				return;
			}
			setIsLoading(true);
			try {
				const [weekData, avails, storeData, userData, shifts] = await Promise.all([
					getAllWeeks(),
					getAllAvailability(),
					getAllStoresFromRegion(user.region.name),
					getAllUsers(),
					getAllShifts(),
				]);
				setWeeks(
					weekData.sort((a, b) =>
						a.year !== b.year ? a.year - b.year : a.week_number - b.week_number,
					),
				);
				setAvailabilityData(avails);
				setStores(storeData);
				setSelectedStoreId((cur) => cur || storeData[0]?.id || 0);
				setUsers(userData);
				setAssignedShifts(shifts);
			} finally {
				setIsLoading(false);
			}
		};
		fetchData();
	}, [user]);

	// ── Derived week data ──────────────────────────────────────────────────────

	const weekObj = weeks.find((w) => w.week_label === currentWeek) ?? null;
	const weekDays = weekObj
		? [0, 1, 2, 3, 4, 5, 6].map((i) =>
				addDays(getWeekStartDate(weekObj.week_number, weekObj.year), i),
			)
		: [];
	const weekDayKeys = weekDays.map((d) => format(d, "yyyy-MM-dd"));

	const DAY_KEYS = [
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
		"sunday",
	] as const;

	const weekAvails = weekObj ? availabilityData.filter((a) => a.week_id === weekObj.id) : [];

	// Ordered store keywords for grouping fix employees
	const STORE_GROUP_ORDER = ["beurre", "grand", "mad", "atelier", "galerie"];
	const storeGroupPriority = (storeId: number | null | undefined): number => {
		if (!storeId) return STORE_GROUP_ORDER.length;
		const store = stores.find((s) => s.id === storeId);
		if (!store) return STORE_GROUP_ORDER.length;
		const name = store.name.toLowerCase();
		const idx = STORE_GROUP_ORDER.findIndex((kw) => name.includes(kw));
		return idx === -1 ? STORE_GROUP_ORDER.length : idx;
	};

	const employeeRows: EmployeeRow[] = [
		// Fix employees grouped by store in defined order, then alphabetically within group
		...users
			.filter((u) => u.role === "fix")
			.sort((a, b) => {
				const pa = storeGroupPriority(a.store_id);
				const pb = storeGroupPriority(b.store_id);
				if (pa !== pb) return pa - pb;
				return (a.nickname || a.first_name).localeCompare(b.nickname || b.first_name);
			})
			.map((u) => ({ user: u, days: {} as EmployeeRow["days"], targetHours: null })),

		// Students with availability for this week
		...weekAvails
			.map((a): EmployeeRow | null => {
				const u = users.find((u) => u.email === a.email);
				if (!u || u.role === "fix") return null;
				const days: EmployeeRow["days"] = {};
				weekDays.forEach((day, i) => {
					const key = format(day, "yyyy-MM-dd");
					days[key] = {
						availability: a[DAY_KEYS[i]] as DayAvailability,
						hours: a.hours,
						week_id: a.week_id,
					};
				});
				return { user: u, days, targetHours: a.hours };
			})
			.filter((x): x is EmployeeRow => x !== null)
			.sort((a, b) =>
				(a.user.nickname || a.user.first_name).localeCompare(b.user.nickname || b.user.first_name),
			),
	];

	const weekShifts = assignedShifts.filter((s) => weekDayKeys.includes(s.shift_date));

	const shiftsFor = (email: string) => weekShifts.filter((s) => s.email === email);
	const assignedHours = (email: string) => shiftsFor(email).reduce((sum, s) => sum + s.hours, 0);
	const storeHours = (email: string, storeId: number) =>
		shiftsFor(email)
			.filter((s) => s.store_id === storeId)
			.reduce((sum, s) => sum + s.hours, 0);
	const staffOnDay = (dayKey: string) =>
		new Set(weekShifts.filter((s) => s.shift_date === dayKey).map((s) => s.email)).size;
	const totalStoreHours = (storeId: number) =>
		weekShifts.filter((s) => s.store_id === storeId).reduce((sum, s) => sum + s.hours, 0);

	// ── Dialog helpers ─────────────────────────────────────────────────────────

	const selectedDayKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
	const existingShift = selectedDayKey
		? assignedShifts.find(
				(s) => s.email === selectedRow?.user.email && s.shift_date === selectedDayKey,
			)
		: undefined;
	const selectedDayAvail = selectedDayKey
		? selectedRow?.days[selectedDayKey]?.availability
		: undefined;
	const isInvalid = shiftEnd <= shiftStart;

	const openDialog = (row: EmployeeRow, day: Date) => {
		const dayKey = format(day, "yyyy-MM-dd");
		const existing = assignedShifts.find(
			(s) => s.email === row.user.email && s.shift_date === dayKey,
		);
		const start = existing?.start_time ?? "09:00";
		const end = existing?.end_time ?? "17:00";
		setSelectedStoreId(existing?.store_id ?? row.user.store_id ?? stores[0]?.id ?? 0);
		setShiftStart(start);
		setShiftEnd(end);
		// Detect break from stored net hours vs gross hours, or auto-apply rule for new shifts
		if (existing) {
			const gross = shiftHours(existing.start_time, existing.end_time);
			setHasBreak(Math.abs(gross - existing.hours - 0.5) < 0.01);
		} else {
			setHasBreak(shiftHours(start, end) >= 6);
		}
		const customKey = `${row.user.email}|${dayKey}`;
		if (otherStore && existing?.store_id === otherStore.id) {
			setOtherStoreName(customStoreNames[customKey] ?? "");
		} else {
			setOtherStoreName("");
		}
		setSelectedRow(row);
		setSelectedDay(day);
		setDialogOpen(true);
	};

	const handleSaveShift = () => {
		if (!selectedRow || !selectedDay || isInvalid || !selectedStoreId) return;
		const email = selectedRow.user.email;
		const dayKey = format(selectedDay, "yyyy-MM-dd");
		const hours = shiftHours(shiftStart, shiftEnd) - (hasBreak ? 0.5 : 0);
		if (otherStore && selectedStoreId === otherStore.id) {
			setCustomStoreNames((prev) => ({ ...prev, [`${email}|${dayKey}`]: otherStoreName.trim() }));
		}

		setAssignedShifts((prev) => {
			const idx = prev.findIndex((s) => s.email === email && s.shift_date === dayKey);
			if (idx !== -1) {
				const next = [...prev];
				next[idx] = {
					...next[idx],
					store_id: selectedStoreId,
					start_time: shiftStart,
					end_time: shiftEnd,
					hours,
				};
				return next;
			}
			const tempId = Math.min(...prev.map((s) => s.id), 0) - 1;
			return [
				...prev,
				{
					id: tempId,
					email,
					shift_date: dayKey,
					store_id: selectedStoreId,
					start_time: shiftStart,
					end_time: shiftEnd,
					hours,
				},
			];
		});
		setDialogOpen(false);
	};

	const handleRemoveShift = () => {
		if (!selectedRow || !selectedDayKey) return;
		setAssignedShifts((prev) =>
			prev.filter((s) => !(s.email === selectedRow.user.email && s.shift_date === selectedDayKey)),
		);
		setDialogOpen(false);
	};

	const handleSaveSchedule = async () => {
		if (weekShifts.length === 0) {
			toast.info("No shifts to save for this week.");
			return;
		}
		setIsSaving(true);
		try {
			// Full-replace: clear existing DB entries then re-insert everything
			const existingDbShifts = weekShifts.filter((s) => s.id > 0);
			if (existingDbShifts.length > 0) await clearShifts(existingDbShifts);

			const nested: Record<string, Record<string, ShiftAssignment>> = {};
			weekShifts.forEach((s) => {
				if (!nested[s.email]) nested[s.email] = {};
				nested[s.email][s.shift_date] = {
					storeId: s.store_id,
					start: s.start_time,
					end: s.end_time,
					hours: s.hours,
				};
			});
			await insertShift(nested);

			const refreshed = await getAllShifts();
			setAssignedShifts(refreshed);
			toast.success(
				`Schedule saved — ${weekShifts.length} shift${weekShifts.length !== 1 ? "s" : ""}`,
			);
		} catch {
			toast.error("Could not save schedule. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleConfirmClear = async () => {
		if (weekShifts.length === 0) {
			toast.info("No shifts to clear.");
			setClearDialogOpen(false);
			return;
		}
		setIsClearing(true);
		try {
			await clearShifts(weekShifts);
			const refreshed = await getAllShifts();
			setAssignedShifts(refreshed);
			toast.success(`Cleared all shifts for ${currentWeek}`);
		} catch {
			toast.error("Could not clear shifts. Please try again.");
		} finally {
			setIsClearing(false);
			setClearDialogOpen(false);
		}
	};

	// ── Render ─────────────────────────────────────────────────────────────────

	if (!user) return <div className="p-6 text-sm text-muted-foreground">No user found.</div>;

	return (
		<div className="flex flex-col gap-6 w-full max-w-[1800px] mx-auto pb-12 px-4 sm:px-6">
			{/* Page header */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight md:text-3xl">Planner</h1>
				<p className="text-muted-foreground text-sm mt-0.5">
					Build and manage weekly staff schedules
				</p>
			</div>

			{/* Toolbar */}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border bg-card shadow-sm">
				{isLoading ? (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<RefreshCw className="h-4 w-4 animate-spin" />
						Loading…
					</div>
				) : weeks.length > 0 ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" className="min-w-40 justify-between gap-2">
								{currentWeek !== "null" ? currentWeek : "Select a week…"}
								<ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="w-56" align="start">
							<DropdownMenuGroup>
								<DropdownMenuLabel>Available weeks</DropdownMenuLabel>
								<DropdownMenuRadioGroup value={currentWeek} onValueChange={setCurrentWeek}>
									{weeks.map((w) => (
										<DropdownMenuRadioItem key={w.id} value={w.week_label}>
											{w.week_label}
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				) : (
					<p className="text-sm text-muted-foreground">No weeks configured</p>
				)}

				<div className="flex items-center gap-2 shrink-0">
					{currentWeek !== "null" && (
						<span className="text-xs text-muted-foreground hidden sm:block">
							{weekShifts.length} shift{weekShifts.length !== 1 ? "s" : ""} planned
						</span>
					)}
					<Button
						variant={colorMode ? "secondary" : "outline"}
						size="sm"
						onClick={() => setColorMode((v) => !v)}
						title="Toggle store colours"
					>
						<Palette className="h-3.5 w-3.5 mr-1.5" />
						Colours
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setClearDialogOpen(true)}
						disabled={weekShifts.length === 0 || currentWeek === "null"}
					>
						<Trash2 className="h-3.5 w-3.5 mr-1.5" />
						Clear week
					</Button>
					<Button
						size="sm"
						onClick={handleSaveSchedule}
						disabled={weekShifts.length === 0 || currentWeek === "null" || isSaving}
					>
						<Save className="h-3.5 w-3.5 mr-1.5" />
						{isSaving ? "Saving…" : "Save schedule"}
					</Button>
				</div>
			</div>

			{/* Empty state */}
			{currentWeek === "null" && !isLoading && (
				<div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
					<div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
						<CalendarPlus className="h-7 w-7 text-muted-foreground" />
					</div>
					<div>
						<p className="font-semibold text-foreground">No week selected</p>
						<p className="text-sm text-muted-foreground mt-1">
							Choose a week from the dropdown above to start building the schedule.
						</p>
					</div>
				</div>
			)}

			{/* Planning table */}
			{currentWeek !== "null" && weekDays.length > 0 && (
				<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
					{/* Table caption */}
					<div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
						<h2 className="font-semibold text-sm">{currentWeek}</h2>
						<span className="text-xs text-muted-foreground">{employeeRows.length} employees</span>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full border-collapse text-xs min-w-[900px]">
							{/* ── Column group widths ── */}
							<colgroup>
								<col className="w-44" />
								{weekDays.map((d) => (
									<col key={d.toISOString()} className="w-28" />
								))}
								{stores.map((s) => (
									<col key={s.id} className="w-16" />
								))}
								<col className="w-16" />
								<col className="w-16" />
							</colgroup>

							<thead>
								<tr className="border-b bg-muted/20">
									{/* Employee header */}
									<th className="sticky left-0 z-20 bg-muted/20 text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-widest text-muted-foreground border-r">
										Employee
									</th>
									{/* Day headers */}
									{weekDays.map((day) => (
										<th
											key={day.toISOString()}
											className="px-2 py-2.5 text-center font-semibold border-r"
										>
											<div className="text-foreground text-[11px]">
												{format(day, "EEE").toUpperCase()}
											</div>
											<div className="text-muted-foreground font-normal text-[10px] mt-0.5">
												{format(day, "d MMM")}
											</div>
										</th>
									))}
									{/* Store headers */}
									{stores.map((store) => {
										const color = getStoreColor(store.id);
										return (
											<th
												key={store.id}
												className="px-1 py-2.5 text-center font-semibold border-r text-[10px] uppercase tracking-wide text-muted-foreground"
												title={store.name}
											>
												<div className="flex flex-col items-center gap-1">
													{colorMode && color && (
														<span
															className="h-3.5 w-3.5 rounded-full block flex-shrink-0"
															style={{
																backgroundColor: color.bg,
																border: `2px solid ${color.text}`,
															}}
														/>
													)}
													<span className="truncate block max-w-14 mx-auto">
														{store.name.length > 7 ? store.name.slice(0, 6) + "…" : store.name}
													</span>
												</div>
											</th>
										);
									})}
									{/* ABSENT */}
									<th className="px-1 py-2.5 text-center font-semibold border-r text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
										Absent
									</th>
									{/* TOTAL */}
									<th className="px-1 py-2.5 text-center font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">
										Total
									</th>
								</tr>
							</thead>

							<tbody>
								{employeeRows.length === 0 ? (
									<tr>
										<td
											colSpan={1 + 7 + stores.length + 2}
											className="py-14 text-center text-muted-foreground text-sm"
										>
											No employees or availability data for this week
										</td>
									</tr>
								) : (
									<>
										{employeeRows.map((entry, idx) => {
											const assigned = assignedHours(entry.user.email);
											const target = entry.targetHours;
											const absent = target != null ? Math.max(0, target - assigned) : null;
											const isOver = target != null && assigned > target;
											const isMatch = target != null && assigned === target && assigned > 0;
											const displayName = entry.user.nickname || entry.user.first_name;
											const rowBg = idx % 2 === 0 ? "bg-card" : "bg-muted/[0.03]";

											return (
												<tr
													key={entry.user.email}
													className={cn(
														"group border-b transition-colors hover:bg-muted/10",
														rowBg,
														entry.user.role === "fix" && "border-l-2 border-l-purple-400/50",
													)}
												>
													{/* Employee name */}
													<td
														className={cn(
															"sticky left-0 z-10 border-r px-3 py-2 transition-colors",
															rowBg,
															"group-hover:bg-muted/10",
														)}
													>
														<div className="flex items-center gap-2">
															<Avatar className="h-7 w-7 shrink-0 border">
																<AvatarFallback className="text-[9px] font-bold bg-primary/5 text-primary">
																	{getInitials(displayName)}
																</AvatarFallback>
															</Avatar>
															<div className="min-w-0">
																<p className="font-semibold truncate text-[11px] leading-tight">
																	{displayName}
																</p>
																<p
																	className={cn(
																		"text-[9px] leading-tight font-medium mt-0.5",
																		isMatch
																			? "text-emerald-600 dark:text-emerald-400"
																			: isOver
																				? "text-amber-600 dark:text-amber-400"
																				: "text-muted-foreground",
																	)}
																>
																	{assigned > 0
																		? `${fmt(assigned)} assigned${target != null ? ` / ${fmt(target)}` : ""}`
																		: target != null
																			? `0 / ${fmt(target)}`
																			: "No target"}
																</p>
															</div>
														</div>
													</td>

													{/* Day cells */}
													{weekDays.map((day) => {
														const dayKey = format(day, "yyyy-MM-dd");
														const dayInfo = entry.days[dayKey];
														const avail = dayInfo?.availability;
														const availStyle = avail ? AVAILABILITY_STYLES[avail] : null;
														const isUnavailable = !avail || avail === "not_available";
														const isFix = entry.user.role === "fix";
														const shift = assignedShifts.find(
															(s) => s.email === entry.user.email && s.shift_date === dayKey,
														);
														const shiftStore = shift
															? stores.find((s) => s.id === shift.store_id)
															: undefined;
														const shiftColor =
															shift && colorMode ? getStoreColor(shift.store_id) : null;

														return (
															<td
																key={dayKey}
																onClick={() => openDialog(entry, day)}
																className={cn(
																	"relative border-r cursor-pointer transition-colors h-[60px] text-center align-middle p-0",
																	!shiftColor &&
																		isUnavailable &&
																		!isFix &&
																		!shift &&
																		"bg-muted/20 hover:bg-muted/30",
																	!shiftColor &&
																		!shift &&
																		!(isUnavailable && !isFix) &&
																		"hover:bg-primary/5",
																	!shiftColor && shift && "hover:bg-primary/[0.07]",
																)}
																style={shiftColor ? { backgroundColor: shiftColor.bg } : undefined}
															>
																{/* Hatch for unavailable */}
																{isUnavailable && !isFix && !shift && (
																	<div className="absolute inset-0 pointer-events-none opacity-[0.07] bg-[repeating-linear-gradient(45deg,#888_0,#888_1px,transparent_0,transparent_50%)] bg-size-[8px_8px]" />
																)}

																{shift ? (
																	<div className="relative z-10 flex flex-col items-center justify-center h-full gap-0.5 px-1">
																		<span
																			className="font-mono font-bold text-[11px] leading-none tracking-tight"
																			style={shiftColor ? { color: shiftColor.text } : undefined}
																		>
																			{shift.start_time}–{shift.end_time}
																		</span>
																		<span
																			className="text-[9px] leading-none text-muted-foreground"
																			style={shiftColor ? { color: shiftColor.sub } : undefined}
																		>
																			{fmt(shift.hours)}
																		</span>
																		{shiftStore && (
																			<span
																				className="text-[9px] font-semibold leading-none truncate max-w-[90px] px-0.5 text-primary/70"
																				style={shiftColor ? { color: shiftColor.sub } : undefined}
																			>
																				{otherStore && shift.store_id === otherStore.id
																					? customStoreNames[`${entry.user.email}|${dayKey}`] ||
																						shiftStore.name
																					: shiftStore.name}
																			</span>
																		)}
																	</div>
																) : (
																	<div className="relative z-10 flex flex-col items-center justify-center h-full gap-0.5">
																		{availStyle && !isUnavailable && (
																			<span
																				className={cn(
																					"text-[10px] font-semibold",
																					availStyle.color,
																				)}
																			>
																				{availStyle.short}
																			</span>
																		)}
																		<div className="opacity-0 group-hover:opacity-60 transition-opacity">
																			<CalendarPlus className="h-3 w-3 text-muted-foreground" />
																		</div>
																	</div>
																)}
															</td>
														);
													})}

													{/* Store hour columns */}
													{stores.map((store) => {
														const h = storeHours(entry.user.email, store.id);
														return (
															<td key={store.id} className="border-r px-1 py-2 text-center">
																{h > 0 ? (
																	<span className="text-[11px] font-semibold text-foreground">
																		{fmt(h)}
																	</span>
																) : (
																	<span className="text-muted-foreground/30 text-[11px]">—</span>
																)}
															</td>
														);
													})}

													{/* Absent */}
													<td className="border-r px-1 py-2 text-center">
														{absent != null && absent > 0 ? (
															<span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
																{fmt(absent)}
															</span>
														) : isMatch ? (
															<span className="text-[11px] text-emerald-500">✓</span>
														) : (
															<span className="text-muted-foreground/30 text-[11px]">—</span>
														)}
													</td>

													{/* Total */}
													<td className="px-1 py-2 text-center">
														{target != null ? (
															<span className="text-[11px] font-semibold text-foreground">
																{fmt(target)}
															</span>
														) : (
															<span className="text-muted-foreground/30 text-[11px]">—</span>
														)}
													</td>
												</tr>
											);
										})}

										{/* Summary row */}
										<tr className="border-t-2 border-border/60 bg-muted/20 font-semibold">
											<td className="sticky left-0 z-10 bg-muted/20 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-r">
												Staff / Total
											</td>
											{weekDays.map((day) => {
												const dayKey = format(day, "yyyy-MM-dd");
												const count = staffOnDay(dayKey);
												return (
													<td key={dayKey} className="border-r px-1 py-2 text-center">
														{count > 0 ? (
															<span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold mx-auto">
																{count}
															</span>
														) : (
															<span className="text-muted-foreground/30 text-[11px]">0</span>
														)}
													</td>
												);
											})}
											{stores.map((store) => {
												const total = totalStoreHours(store.id);
												return (
													<td
														key={store.id}
														className="border-r px-1 py-2 text-center text-foreground text-[11px]"
													>
														{total > 0 ? (
															fmt(total)
														) : (
															<span className="text-muted-foreground/30">—</span>
														)}
													</td>
												);
											})}
											<td className="border-r px-1 py-2 text-center text-muted-foreground/40 text-[11px]">
												—
											</td>
											<td className="px-1 py-2 text-center text-foreground text-[11px]">
												{fmt(weekShifts.reduce((s, sh) => s + sh.hours, 0))}
											</td>
										</tr>
									</>
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* ── Shift dialog ─────────────────────────────────────────────── */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle className="text-base leading-snug">
							{selectedRow?.user.nickname || selectedRow?.user.first_name}
							<span className="text-muted-foreground font-normal ml-1 text-sm">
								· {selectedDay ? format(selectedDay, "EEE d MMM") : ""}
							</span>
						</DialogTitle>
						<DialogDescription>
							{existingShift
								? "Edit or remove the assigned shift."
								: "Assign a shift for this slot."}
						</DialogDescription>
					</DialogHeader>

					{/* Availability badge (students only) */}
					{selectedDayAvail && (
						<div>
							{(() => {
								const style = AVAILABILITY_STYLES[selectedDayAvail];
								return (
									<span
										className={cn(
											"inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border bg-muted",
										)}
									>
										<span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
										{style.label}
									</span>
								);
							})()}
						</div>
					)}

					<div className="space-y-3 pt-1">
						{/* Store */}
						<div className="space-y-1.5">
							<label className="text-xs font-medium text-muted-foreground">Store</label>
							<Select
								value={selectedStoreId.toString()}
								onValueChange={(v) => setSelectedStoreId(Number(v))}
							>
								<SelectTrigger className="w-full">
									<SelectValue
										placeholder="Choose store"
										// value={selectedRow?.user.store_id?.toString()}
									/>
								</SelectTrigger>
								<SelectContent>
									{stores.map((s) => (
										<SelectItem key={s.id} value={s.id.toString()}>
											{s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{otherStore && selectedStoreId === otherStore.id && (
								<div className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
									<Input
										placeholder="Which store? (optional)"
										value={otherStoreName}
										onChange={(e) => setOtherStoreName(e.target.value)}
										autoFocus
									/>
								</div>
							)}
						</div>

						{/* Times */}
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-muted-foreground">Start</label>
								<Select value={shiftStart} onValueChange={setShiftStart}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{SHIFT_TIME_OPTIONS.map((t) => (
											<SelectItem key={`s-${t}`} value={t}>
												{t}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs font-medium text-muted-foreground">End</label>
								<Select value={shiftEnd} onValueChange={setShiftEnd}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{SHIFT_TIME_OPTIONS.map((t) => (
											<SelectItem key={`e-${t}`} value={t}>
												{t}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Break checkbox */}
						<label className="flex items-center gap-2.5 cursor-pointer select-none">
							<Checkbox checked={hasBreak} onCheckedChange={(v) => setHasBreak(v === true)} />
							<span className="text-sm">30 min break</span>
							{shiftHours(shiftStart, shiftEnd) >= 6 && !hasBreak && (
								<span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
									(≥ 6h — break recommended)
								</span>
							)}
						</label>

						{isInvalid ? (
							<p className="text-xs text-destructive">End time must be after start time.</p>
						) : shiftStart && shiftEnd ? (
							(() => {
								const gross = shiftHours(shiftStart, shiftEnd);
								const net = gross - (hasBreak ? 0.5 : 0);
								return (
									<p className="text-xs text-muted-foreground">
										<span className="font-semibold text-foreground">{fmt(net)}</span>
										{" worked"}
										{hasBreak && <span className="ml-1 opacity-60">({fmt(gross)} − 30 min)</span>}
									</p>
								);
							})()
						) : null}
					</div>

					<DialogFooter className="gap-2">
						{existingShift && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleRemoveShift}
								className="text-destructive hover:text-destructive mr-auto"
							>
								<X className="h-3.5 w-3.5 mr-1" />
								Remove
							</Button>
						)}
						<Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
							Cancel
						</Button>
						<Button size="sm" onClick={handleSaveShift} disabled={isInvalid || !selectedStoreId}>
							{existingShift ? "Update shift" : "Assign shift"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ── Clear confirmation dialog ─────────────────────────────────── */}
			<Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Clear all shifts?</DialogTitle>
						<DialogDescription>
							This will permanently delete all{" "}
							<strong>
								{weekShifts.length} shift{weekShifts.length !== 1 ? "s" : ""}
							</strong>{" "}
							for <strong>{currentWeek}</strong>. This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" size="sm" onClick={() => setClearDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={handleConfirmClear}
							disabled={isClearing}
						>
							{isClearing ? "Clearing…" : "Clear all"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

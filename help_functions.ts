import { Availability, DayAvailability, User, Week } from "./types";
import { Sun, Sunset, Clock, X } from "lucide-react";
import { addDays } from "date-fns";

const getInitials = (name: string) => {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase();
};

function convertToCSV(data: Availability[]) {
	const headers = Object.keys(data[0]).join(",");
	const rows = data.map((obj) => Object.values(obj).join(","));
	return [headers, ...rows].join("\n");
}

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

const AVAILABILITY_STYLES: Record<
	DayAvailability,
	{ label: string; short: string; icon: typeof Sun; color: string; dot: string }
> = {
	morning: {
		label: "Morning",
		short: "AM",
		icon: Sun,
		color: "text-amber-600 dark:text-amber-400",
		dot: "bg-amber-500",
	},
	afternoon: {
		label: "Afternoon",
		short: "PM",
		icon: Sunset,
		color: "text-blue-600 dark:text-blue-400",
		dot: "bg-blue-500",
	},
	whole_day: {
		label: "Full Day",
		short: "All",
		icon: Clock,
		color: "text-green-600 dark:text-green-400",
		dot: "bg-green-500",
	},
	not_available: {
		label: "Not Available",
		short: "N/A",
		icon: X,
		color: "text-muted-foreground",
		dot: "bg-muted-foreground",
	},
};

// const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_KEYS: (keyof Availability)[] = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
];

function getWeekStartDate(weekNumber: number, year: number): Date {
	// ISO week: Jan 4 is always in week 1
	const jan4 = new Date(year, 0, 4);
	const jan4Day = jan4.getDay() || 7; // Convert Sunday=0 to 7
	const mondayOfWeek1 = addDays(jan4, 1 - jan4Day);
	return addDays(mondayOfWeek1, (weekNumber - 1) * 7);
}

function getAvailabilityForDate(
	date: Date,
	availabilityData: Availability[],
	users: User[],
	weeks: Week[],
): Array<{ user: User; availability: DayAvailability; hours: number; week_id: string }> {
	const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...
	const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0, Sun=6
	const dayKey = DAY_KEYS[dayIndex];
	// console.log("DayKey -> ,", dayKey);

	const results: Array<{
		user: User;
		availability: DayAvailability;
		hours: number;
		week_id: string;
	}> = [];

	// Find which week this date belongs to
	const matchingWeek = weeks.find((week) => {
		const weekStart = getWeekStartDate(week.week_number, week.year);
		const weekEnd = addDays(weekStart, 6);
		return date >= weekStart && date <= weekEnd;
	});
	// console.log("Is is a matching week? -> ", matchingWeek);
	if (matchingWeek) {
		// console.log("Do we come here? -> ", availabilityData);

		// Find availability for this specific week
		availabilityData.forEach((a) => {
			// console.log("a.week_id === matchingWeek.id: ", a.week_id === matchingWeek.id);
			if (a.week_id === matchingWeek.id) {
				const dayAvailability = a[dayKey] as DayAvailability;
				// console.log("dayAvailability: ", dayAvailability);
				if (dayAvailability !== "not_available") {
					const user = users.find((u) => u.email === a.email);
					// console.log("User = ", user);
					if (user) {
						// console.log("PUSHHH");
						results.push({
							user,
							availability: dayAvailability,
							hours: a.hours,
							week_id: a.week_id,
						});
					}
				}
			}
		});
	}

	// Sort: whole_day first, then morning, then afternoon
	const priority: Record<DayAvailability, number> = {
		whole_day: 3,
		morning: 2,
		afternoon: 1,
		not_available: 0,
	};
	results.sort((a, b) => priority[b.availability] - priority[a.availability]);
	// console.log("FROM BACKEND: ", results);
	return results;
}

export {
	getInitials,
	convertToCSV,
	getWeekDateRange,
	AVAILABILITY_STYLES,
	DAY_KEYS,
	getWeekStartDate,
	getAvailabilityForDate,
};

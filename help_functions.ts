import { Availability } from "./types";

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

export { getInitials, convertToCSV, getWeekDateRange };

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

export { getInitials, convertToCSV };

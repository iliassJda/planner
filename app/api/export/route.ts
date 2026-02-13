import { getAllAvailability } from "@/action/supabase";
import { convertToCSV } from "@/help_functions";
import { NextResponse } from "next/server";

export async function GET() {
	const data = await getAllAvailability();

	const csv = convertToCSV(data);

	return new NextResponse(csv, {
		headers: {
			"Content-Type": "text/csv",
			"Content-Disposition": "attachment; filename=availability.csv",
		},
	});
}

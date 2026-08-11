import { getAllAvailability } from "@/action/supabase";
import { convertToCSV } from "@/help_functions";
import { getCurrentUser } from "@/lib/auth-guards";
import { NextResponse } from "next/server";

export async function GET() {
	// Previously selected a non-existent "admin" column, which made this route
	// error out for everyone. Role lives in User.role_name.
	const user = await getCurrentUser();

	if (!user) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	if (user.role !== "admin") {
		return new NextResponse("Forbidden: No rights...", { status: 403 });
	}

	const data = await getAllAvailability();

	const csv = convertToCSV(data);

	return new NextResponse(csv, {
		headers: {
			"Content-Type": "text/csv",
			"Content-Disposition": "attachment; filename=availability.csv",
		},
	});
}

import { getAllAvailability } from "@/action/supabase";
import { convertToCSV } from "@/help_functions";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/admin";

export async function GET() {
	const session = await auth();

	if (!session?.user?.email) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	const email = session.user.email;

	const { data: user, error } = await supabaseAdmin
		.from("User")
		.select("admin, allowed")
		.eq("email", email)
		.maybeSingle();

	if (error) {
		return new NextResponse("Error fetching user data", { status: 500 });
	}

	if (!user?.admin) {
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

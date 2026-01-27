"use server";

import { User, Week } from "@/types";
import { supabaseAdmin } from "@/utils/supabase/admin";

async function getAllowData(user: User) {
	const { data, error } = await supabaseAdmin
		.from("User")
		.select("email, allowed, admin")
		.eq("email", user.email)
		.eq("allowed", true)
		.maybeSingle(); // <-- IMPORTANT

	if (error) {
		console.error(error);
		return null;
	}

	return data; // returns: { email: string, allowed: boolean } | null
}

async function getTotalStudents() {
	const { count, error } = await supabaseAdmin
		.from("User")
		.select("email", { count: "exact", head: true })
		.eq("allowed", true)
		.eq("admin", false);

	if (error) {
		console.error("Error fetching total students:", error);
		return 0;
	}

	return count || 0;
}

async function getAllWeeks() {
	const { data, error } = await supabaseAdmin
		.from("Week")
		.select("*")
		.order("year", { ascending: false })
		.order("week_number", { ascending: false });

	if (error) {
		console.error("Error fetching weeks:", error);
		return [];
	}

	return data as Week[];
}

async function insertWeeks(weeks: Omit<Week, "is_active">[]) {
	const weeksToInsert = weeks.map((week) => ({
		id: week.id,
		week_number: week.week_number,
		year: week.year,
		week_label: week.week_label,
		is_active: true,
	}));

	const { data, error } = await supabaseAdmin.from("Week").insert(weeksToInsert).select();

	if (error) {
		console.error("Error inserting weeks:", error);
		return null;
	}

	return data as Week[];
}

// Upsert version - inserts or updates if already exists
async function upsertWeeks(weeks: Omit<Week, "is_active">[]) {
	const weeksToUpsert = weeks.map((week) => ({
		id: week.id,
		week_number: week.week_number,
		year: week.year,
		week_label: week.week_label,
		is_active: true,
	}));

	const { data, error } = await supabaseAdmin
		.from("Week")
		.upsert(weeksToUpsert, { onConflict: "id" })
		.select();

	if (error) {
		console.error("Error upserting weeks:", error);
		return null;
	}

	return data as Week[];
}

export { getAllowData, getTotalStudents, getAllWeeks, insertWeeks, upsertWeeks };

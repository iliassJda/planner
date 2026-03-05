"use server";

import { Availability, User, Week } from "@/types";
import { supabaseAdmin } from "@/utils/supabase/admin";

async function exportAvailability() {
	const { data, error } = await supabaseAdmin.from("Availability").select("*");

	if (error) {
		console.error("Error fetching availability:", error);
		return [];
	}

	return data as Availability[];
}

async function deactivateWeek(weekId: string) {
	// First set is_active to false for the week
	const { data: updatedWeek, error: weekError } = await supabaseAdmin
		.from("Week")
		.update({ is_active: false })
		.eq("id", weekId)
		.select();

	if (weekError) {
		console.error("Error deactivating week:", weekError);
		return null;
	}

	return updatedWeek as Week[];
}

async function activateWeek(weekId: string) {
	// First set is_active to true for the week
	const { data: updatedWeek, error: weekError } = await supabaseAdmin
		.from("Week")
		.update({ is_active: true })
		.eq("id", weekId)
		.select();

	if (weekError) {
		console.error("Error activating week:", weekError);
		return null;
	}

	return updatedWeek as Week[];
}

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

async function getAllUsers() {
	const { data, error } = await supabaseAdmin.from("User").select("*");

	if (error) {
		console.error("Error fetching users:", error);
		return [];
	}

	// console.log("Fetched users:", data);

	return data as User[];
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

async function insertAvailability(availability: Availability) {
	const { data, error } = await supabaseAdmin.from("Availability").insert(availability).select();

	if (error) {
		console.error("Error inserting availability:", error);
		return null;
	}

	// console.log("Inserted availability:", data);
	return data as Availability[];
}

async function updateAvailability(availability: Availability) {
	const { data, error } = await supabaseAdmin
		.from("Availability")
		.update(availability)
		.eq("week_id", availability.week_id)
		.eq("email", availability.email)
		.select();

	if (error) {
		console.error("Error updating availability:", error);
		return null;
	}

	return data as Availability[];
}

async function getAvailabilityByEmail(email: string) {
	const { data, error } = await supabaseAdmin.from("Availability").select("*").eq("email", email);

	if (error) {
		console.error("Error fetching availability by email:", error);
		return [];
	}
	// console.log("Fetched availability for email:", email, data);
	return data as Availability[];
}

async function deleteWeek(weekId: string) {
	// First delete all availability records for this week
	const { error: availabilityError } = await supabaseAdmin
		.from("Availability")
		.delete()
		.eq("week_id", weekId);

	if (availabilityError) {
		console.error("Error deleting availability records:", availabilityError);
		return null;
	}

	// Then delete the week itself
	const { data, error } = await supabaseAdmin.from("Week").delete().eq("id", weekId).select();

	if (error) {
		console.error("Error deleting week:", error);
		return null;
	}

	return data as Week[];
}

async function updateUserPermissions(email: string, admin: boolean) {
	const { data, error } = await supabaseAdmin
		.from("User")
		.update({ admin })
		.eq("email", email)
		.select();

	if (error) {
		console.error("Error updating user permissions:", error);
		return null;
	}

	return data as User[];
}

async function updateUserStatus(email: string, allowed: boolean) {
	const { data: userData } = await supabaseAdmin.from("User").select("allowed").eq("email", email);

	console.log("this is the data -> ", userData);

	if (!userData) return null;

	const value = userData[0].allowed;

	const { data, error } = allowed
		? await supabaseAdmin.from("User").update({ allowed }).eq("email", email).select()
		: value
			? await supabaseAdmin.from("User").update({ allowed }).eq("email", email).select()
			: await supabaseAdmin.from("User").delete().eq("email", email).select();
	// const { data, error } = allowed
	// 	? await supabaseAdmin.from("User").update({ allowed }).eq("email", email).select()
	// 	: await supabaseAdmin.from("User").delete().eq("email", email).select();

	if (error) {
		console.error("Error updating user status:", error);
		return null;
	}

	return data as User[];

	// return data as User[];
	// if (allowed) {
	// 	const { data, error } = await supabaseAdmin
	// 		.from("User")
	// 		.update({ allowed })
	// 		.eq("email", email)
	// 		.select();
	// 	if (error) {
	// 		console.error("Error updating user status:", error);
	// 		return null;
	// 	}

	// 	return data as User[];
	// } else {
	// 	const { data, error } = await supabaseAdmin.from("User").delete().eq("email", email).select();

	// }
}

async function getAllAvailability() {
	const { data, error } = await supabaseAdmin
		.from("Availability")
		.select("*")
		.order("week_number", { ascending: true });

	if (error) {
		console.error("Error fetching all availability:", error);
		return [];
	}

	return data as Availability[];
}

async function getComments() {
	const { data, error } = await supabaseAdmin
		.from("Availability")
		.select("email, week_id, comment");

	if (error) {
		console.error("Error fetching comments:", error);
		return [];
	}

	return data as { email: string; week_id: string; comment: string }[];
}

export {
	getAllowData,
	getTotalStudents,
	getAllWeeks,
	insertWeeks,
	upsertWeeks,
	insertAvailability,
	updateAvailability,
	getAvailabilityByEmail,
	deleteWeek,
	getAllUsers,
	updateUserPermissions,
	updateUserStatus,
	getAllAvailability,
	exportAvailability,
	getComments,
	deactivateWeek,
	activateWeek,
};

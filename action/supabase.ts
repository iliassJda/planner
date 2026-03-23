"use server";

import { Availability, RoleName, User, Week, Store, ShiftAssignment, Shift } from "@/types";
import { supabaseAdmin } from "@/utils/supabase/admin";

const ROLE_NAMES: RoleName[] = ["admin", "student", "fix"];

// async function getRoleId(role: RoleName) {
//   const { data: roleData, error: roleError } = await supabaseAdmin
//     .from("roles")
//     .select("id")
//     .eq("name", role)
//     .maybeSingle(); // <-- IMPORTANT
//   return { roleData, roleError };
// }

function isRoleName(value: unknown): value is RoleName {
	return typeof value === "string" && ROLE_NAMES.includes(value as RoleName);
}

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
		// .select("email, allowed, admin")
		.select("email, allowed, role_name")
		.eq("email", user.email)
		.eq("allowed", true)
		.maybeSingle(); // <-- IMPORTANT

	if (error) {
		console.error(error);
		return null;
	}

	// console.log("This is the data: ", data);

	if (!data) {
		return null;
	}

	const roleName = data.role_name;

	// return data; // returns: { email: string, allowed: boolean } | null
	// const rawRole = Array.isArray(data.roles)
	//   ? data.roles[0]?.name
	//   : (data.roles as { name?: string } | null)?.name;

	if (!isRoleName(roleName)) {
		return null;
	}

	return {
		email: data.email,
		role: roleName,
	};
}

// async function getAllUsers() {
// 	const { data, error } = await supabaseAdmin.from("User").select("*");

// 	if (error) {
// 		console.error("Error fetching users:", error);
// 		return [];
// 	}

// 	// console.log("Fetched users:", data);

// 	return data as User[];
// }

async function getAllUsers() {
	const { data, error } = await supabaseAdmin
		.from("User")
		.select("email, first_name, image, allowed, role_name");

	if (error) {
		console.error("Error fetching users:", error);
		return [];
	}

	return data.map((user) => ({
		email: user.email,
		first_name: user.first_name,
		image: user.image,
		allowed: user.allowed,
		role: user.role_name,
	})) as User[];
}

async function getTotalStudents() {
	// const { roleData, roleError } = await getRoleId("user");

	// if (roleError) {
	//   console.error("Error fetching role id:", roleError);
	//   return 0;
	// }

	const { count, error } = await supabaseAdmin
		.from("User")
		.select("email", { count: "exact", head: true })
		.eq("allowed", true)
		.eq("role_name", "student");

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

function fromRecordToShifts(shifts: Record<string, Record<string, ShiftAssignment>>) {
	const result = [];

	for (const [email, dates] of Object.entries(shifts)) {
		for (const [date, shift] of Object.entries(dates)) {
			result.push({
				email: email,
				shift_date: date,
				store_id: shift.storeId,
				start_time: shift.start,
				end_time: shift.end,
				hours: shift.hours,
			} as Shift);
		}
	}

	return result;
}

async function insertShift(shifts: Record<string, Record<string, ShiftAssignment>>) {
	const result = fromRecordToShifts(shifts);
	const { data, error } = await supabaseAdmin.from("shifts").insert(result).select();

	if (error) {
		console.error("Error inserting shifts:", error);
		return [];
	}

	// console.log("Inserted shifts:", data);

	return data;
}

async function getAllShifts() {
	const { data, error } = await supabaseAdmin.from("shifts").select("*");

	if (error) {
		console.error("Error getting all shifts: ", error);
		return [];
	}

	console.log("This is all the shifts: ", data);
	return data as Shift[];
}

async function clearShifts(shifts: Shift[]) {
	// const { data, error } = await supabaseAdmin.from("shifts").delete(shifts);
	// const shiftsArray = fromRecordToShifts(shifts);
	const shiftIds = shifts.map((s) => s.id);

	console.log("These are the ID: ", shiftIds, " and there are the shifts: ", shifts);

	const { data, error } = await supabaseAdmin.from("shifts").delete().in("id", shiftIds);

	if (error) {
		console.error("Error clearing shifts: ", error);
		return [];
	}

	return data;
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

async function updateUserPermissions(email: string, role: RoleName) {
	// console.log("This is the current role: ", role);

	// const { roleData, roleError } = await getRoleId(role);

	// if (roleError || !roleData) {
	//   console.error("Error fetching role:", roleError);
	//   return null;
	// }

	const { data, error } = await supabaseAdmin
		.from("User")
		.update({ role_name: role })
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

	// console.log("this is the data -> ", userData);

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

async function getAllStoresFromRegion(region: string) {
	const { data, error } = await supabaseAdmin.from("store").select("*").eq("region", region);

	if (error) {
		console.error("Error fetching stores from ", region, " :", error);
	}

	return data as Store[];
}

async function getAllStoresFromRegion(region: string) {
	const { data, error } = await supabaseAdmin.from("store").select("*").eq("region", region);

	if (error) {
		console.error("Error fetching stores from ", region, " :", error);
	}

	return data as Store[];
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

async function getCsvAvailabilities(availabilityData: Availability[]) {
	const headers = [
		"Email",
		"Week ID",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
		"Sunday",
		"Week Number",
		"Hours Desired",
		"Comment",
	];

	const csvContent = [
		headers.join(","),
		...availabilityData.map((row) =>
			[
				row.email,
				row.week_id,
				row.monday,
				row.tuesday,
				row.wednesday,
				row.thursday,
				row.friday,
				row.saturday,
				row.sunday,
				row.week_number,
				row.hours,
				row.comment,
			].join(","),
		),
	].join("\n");
	return csvContent;
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
	getCsvAvailabilities,
	getAllStoresFromRegion,
	insertShift,
	getAllShifts,
	clearShifts,
};

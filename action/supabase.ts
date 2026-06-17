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
		.select("email, first_name, nickname, image, allowed, role_name, store_id");

	if (error) {
		console.error("Error fetching users:", error);
		return [];
	}
	// console.log("Fetched users:", data);

	return data.map((user) => ({
		email: user.email,
		first_name: user.first_name,
		nickname: user.nickname,
		image: user.image,
		allowed: user.allowed,
		role: user.role_name,
		store_id: user.store_id ?? null,
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
				custom_store_name: shift.customStoreName ?? null,
				absence_type: shift.absenceType ?? null,
			} as Shift);
		}
	}

	return result;
}

async function insertShift(shifts: Record<string, Record<string, ShiftAssignment>>) {
	const result = fromRecordToShifts(shifts);
	const { data, error } = await supabaseAdmin.from("shifts").insert(result).select();

	if (error) throw new Error(error.message);

	return data;
}

async function getAllShifts() {
	const { data, error } = await supabaseAdmin.from("shifts").select("*");

	if (error) throw new Error(error.message);

	return data as Shift[];
}

async function clearShifts(shifts: Shift[]) {
	const shiftIds = shifts.map((s) => s.id);

	const { error } = await supabaseAdmin.from("shifts").delete().in("id", shiftIds);

	if (error) throw new Error(error.message);
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

async function getStoresForApp() {
	const region = process.env.APP_REGION;
	if (!region) {
		console.error("APP_REGION env var is not set");
		return [];
	}
	return getAllStoresFromRegion(region);
}

async function assignUserStore(email: string, storeId: number | null) {
	const { data, error } = await supabaseAdmin
		.from("User")
		.update({ store_id: storeId })
		.eq("email", email)
		.select();

	if (error) {
		console.error("Error assigning store to user:", error);
		return null;
	}

	return data as User[];
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

async function createEmployee(name: string) {
	const slug = name.trim().toLowerCase().replace(/\s+/g, ".");
	const email = `${slug}.${Date.now()}@employee.local`;

	const { data, error } = await supabaseAdmin
		.from("User")
		.insert({ first_name: name.trim(), email, image: "", allowed: true, role_name: "fix" })
		.select();

	if (error) {
		console.error("Error creating employee:", error);
		return null;
	}

	return data as User[];
}

async function changeNickname(email: string, newNickname: string) {
	const { data, error } = await supabaseAdmin
		.from("User")
		.update({ nickname: newNickname })
		.eq("email", email)
		.select();

	if (error) {
		console.error("Error updating nickname:", error);
		return null;
	}

	return data as User[];
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
	changeNickname,
	createEmployee,
	getStoresForApp,
	assignUserStore,
	getPlanningPageData,
};

async function getPlanningPageData(weekLabel?: string) {
	const { getWeekStartDate } = await import("@/help_functions");
	const { addDays, format } = await import("date-fns");

	// 1. Fetch all weeks for navigation, sorted chronologically
	const { data: allWeeksData, error: weeksError } = await supabaseAdmin
		.from("Week")
		.select("*")
		.order("year", { ascending: true })
		.order("week_number", { ascending: true });

	if (weeksError) throw new Error(weeksError.message);
	const allWeeks: Week[] = (allWeeksData ?? []) as Week[];

	// 2. Find the target week — by label, or fall back to the active week, then latest
	let week: Week | null = null;
	if (weekLabel) {
		week = allWeeks.find((w) => w.week_label === weekLabel) ?? null;
	}
	if (!week) {
		week = allWeeks.find((w) => w.is_active) ?? allWeeks[allWeeks.length - 1] ?? null;
	}
	if (!week) return null;

	// 3. Build the 7 date strings for this week
	const start = getWeekStartDate(week.week_number, week.year);
	const weekDates = Array.from({ length: 7 }, (_, i) =>
		format(addDays(start, i), "yyyy-MM-dd"),
	);

	// 4. Fetch shifts for those dates
	const { data: shiftsData, error: shiftsError } = await supabaseAdmin
		.from("shifts")
		.select("*")
		.in("shift_date", weekDates);

	if (shiftsError) throw new Error(shiftsError.message);
	const shifts: Shift[] = (shiftsData ?? []) as Shift[];

	// 5. Fetch users that appear in those shifts
	const emails = [...new Set(shifts.map((s) => s.email))];
	const { data: usersData, error: usersError } =
		emails.length > 0
			? await supabaseAdmin
					.from("User")
					.select("email, first_name, nickname, image, role_name, store_id")
					.in("email", emails)
			: { data: [], error: null };

	if (usersError) throw new Error(usersError.message);
	const users: User[] = (usersData ?? []).map((u) => ({
		email: u.email,
		first_name: u.first_name,
		nickname: u.nickname,
		image: u.image,
		allowed: true,
		role: u.role_name,
		store_id: u.store_id ?? null,
	})) as User[];

	// 6. Fetch stores
	const region = process.env.APP_REGION;
	const storeQuery = region
		? supabaseAdmin.from("store").select("*").eq("region", region)
		: supabaseAdmin.from("store").select("*");
	const { data: storesData, error: storesError } = await storeQuery;
	if (storesError) throw new Error(storesError.message);
	const stores: Store[] = (storesData ?? []) as Store[];

	// 7. Compute prev/next week labels for navigation
	const currentIdx = allWeeks.findIndex((w) => w.id === week!.id);
	const prevWeek = currentIdx > 0 ? allWeeks[currentIdx - 1] : null;
	const nextWeek = currentIdx < allWeeks.length - 1 ? allWeeks[currentIdx + 1] : null;

	return { week, weekDates, shifts, users, stores, prevWeek, nextWeek, allWeeks };
}

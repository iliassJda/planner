import { supabaseAdmin } from "@/utils/supabase/admin";
import { format, subWeeks } from "date-fns";
import type { Shift } from "@/types";

/**
 * Calendar-feed data access.
 *
 * These live outside `action/supabase.ts` on purpose. That file is a
 * `"use server"` module, so everything it exports becomes a public HTTP
 * endpoint — which would let anyone read any user's shifts by passing an
 * email. The iCal feed authenticates by opaque token instead of by session,
 * so its queries are kept here as plain server-side functions that only the
 * route handler can reach.
 */

/** Resolves an iCal subscription token to the email that owns it, or null. */
export async function verifyIcalToken(token: string): Promise<string | null> {
	const { data, error } = await supabaseAdmin
		.from("User")
		.select("email")
		.eq("ical_token", token)
		.maybeSingle();

	if (error) {
		console.error("Error verifying ical token:", error);
		return null;
	}

	return data?.email ?? null;
}

/** Shifts from the last two weeks onward for one user, for the calendar feed. */
export async function getUpcomingShiftsForUser(email: string): Promise<Shift[]> {
	const since = format(subWeeks(new Date(), 2), "yyyy-MM-dd");

	const { data, error } = await supabaseAdmin
		.from("shifts")
		.select("*")
		.eq("email", email)
		.gte("shift_date", since);

	if (error) throw error;

	// Only emit calendar events for the work portion of a shift; pure absence
	// rows (no store) never had a work component to put on the calendar.
	return (data as Shift[]).filter((s) => s.store_id != null);
}

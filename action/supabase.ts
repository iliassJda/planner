"use server";

import { User } from "@/types";
import { supabaseAdmin } from "@/utils/supabase/admin";

async function getAllowData(user: User) {
	const { data, error } = await supabaseAdmin
		.from("User")
		.select("email, allowed")
		.eq("email", user.email)
		.eq("allowed", true)
		.maybeSingle(); // <-- IMPORTANT

	if (error) {
		console.error(error);
		return null;
	}

	return data; // returns: { email: string, allowed: boolean } | null
}

export { getAllowData };

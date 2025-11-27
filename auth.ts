import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "./utils/supabase/admin";

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [Google],
	callbacks: {
		async signIn({ user, account, profile }) {
			const email = user.email;

			if (!email) return false; // just in case

			const supabase = supabaseAdmin;

			// 1. Check if a user with this email already exists
			const { data: existingUser, error: error } = await supabase
				.from("User")
				.select("*")
				.eq("email", email)
				.single();
			// const { data: test, error: err } = await supabase.from("User").select("*");

			// console.log("This is a test", existingUser);

			// If query fails with "No rows" that's okay — means not found
			if (error && error.code != "PGRST116") {
				// console.log("Supabase error:", error);
				return false;
			}

			// 2. If no existing user, insert a new one
			if (!existingUser) {
				await supabase.from("User").insert({
					email,
					allowed: false,
					admin: false,
				});
			} else {
				console.log("user " + user.email + " already exists in the database so not added");
			}

			return true;
		},
	},
});

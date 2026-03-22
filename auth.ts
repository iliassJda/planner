import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "./utils/supabase/admin";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    }),
  ],
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
      const userFirstName = user?.name?.split(" ")[0];

      // const { data: roleData, error: roleError } = await supabaseAdmin
      // 	.from("roles")
      // 	.select("id")
      // 	.eq("name", "user")
      // 	.maybeSingle(); // <-- IMPORTANT

      // if (roleError || !roleData) {
      // 	console.error("Error fetching role:", roleError);
      // 	return false;
      // }

      // console.log("This is the ID: ", roleData.id);

      // console.log("First name is " + userFirstName);

      // 2. If no existing user, insert a new one
      if (!existingUser) {
        // const { data: userData, error: userError }
        await supabase.from("User").insert({
          first_name: userFirstName,
          email,
          allowed: false,
          role_name: "user",
          image: user.image,
        });
        // console.log("This is the result: ", userData, " Or this is the error: ", userError);
      } else {
        // console.log("user " + user.email + " already exists in the database so not added");
      }

      return true;
    },
  },
});

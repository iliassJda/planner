// utils/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

// This module is server-only. Reached from a "use client" file, the service-role
// key is undefined in the browser bundle and supabase-js fails with the opaque
// "supabaseKey is required" — this turns that into the actual problem. Anything
// a client component needs from here must go through a server action instead.
if (typeof window !== "undefined") {
	throw new Error(
		"utils/supabase/admin.ts is server-only and was imported into client code. " +
			"Call a server action instead of importing this (or lib/auth-guards) from a \"use client\" component.",
	);
}

export const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!, // public
	process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only, never exposed
);

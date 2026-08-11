import { auth } from "@/auth";
import { supabaseAdmin } from "@/utils/supabase/admin";
import type { RoleName } from "@/types";

const ROLE_NAMES: RoleName[] = ["admin", "student", "fix"];

function isRoleName(value: unknown): value is RoleName {
	return typeof value === "string" && ROLE_NAMES.includes(value as RoleName);
}

export type SessionUser = {
	email: string;
	role: RoleName;
};

/**
 * Resolves the caller's identity from the NextAuth session and re-reads their
 * role from the database.
 *
 * The role is deliberately NOT taken from the session: the session is issued at
 * sign-in and would keep asserting a stale role after an admin demotes someone.
 * Returns null when there is no session, the account is unknown, or it has not
 * been approved (`allowed = false`).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
	const session = await auth();
	const email = session?.user?.email;
	if (!email) return null;

	const { data, error } = await supabaseAdmin
		.from("User")
		.select("email, role_name, allowed")
		.eq("email", email)
		.maybeSingle();

	if (error || !data || data.allowed !== true) return null;
	if (!isRoleName(data.role_name)) return null;

	return { email: data.email, role: data.role_name };
}

/** Asserts an approved, signed-in caller. Throws otherwise. */
export async function requireUser(): Promise<SessionUser> {
	const user = await getCurrentUser();
	if (!user) throw new Error("Unauthorized");
	return user;
}

/** Asserts an approved, signed-in caller with the admin role. Throws otherwise. */
export async function requireAdmin(): Promise<SessionUser> {
	const user = await requireUser();
	if (user.role !== "admin") throw new Error("Forbidden");
	return user;
}

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

/** Emails allowed to read and answer every ticket, from PLANNER_SUPPORT_EMAILS. */
export function supportAdminEmails(): string[] {
	return (process.env.PLANNER_SUPPORT_EMAILS ?? "")
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
}

export function isSupportAdminEmail(email: string): boolean {
	const allowed = supportAdminEmails();
	// Fail closed: an unset or empty allowlist grants nobody access rather than
	// silently opening every ticket to all admins.
	return allowed.length > 0 && allowed.includes(email.toLowerCase());
}

/**
 * Asserts a caller allowed to triage *all* tickets, across both pools.
 *
 * Separate from `requireAdmin` on purpose: the pools exist so the manager keeps
 * their own space and never reads student reports, so this is an explicit email
 * allowlist rather than a role. Admin is still required underneath as defence in
 * depth.
 */
export async function requireSupportAdmin(): Promise<SessionUser> {
	const user = await requireAdmin();
	if (!isSupportAdminEmail(user.email)) throw new Error("Forbidden");
	return user;
}

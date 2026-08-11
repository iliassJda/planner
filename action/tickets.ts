"use server";

import { supabaseAdmin } from "@/utils/supabase/admin";
import { requireUser, requireSupportAdmin } from "@/lib/auth-guards";
import type { RoleName, Ticket, TriageTicket, TicketCategory, TicketStatus } from "@/types";

const CATEGORIES: TicketCategory[] = ["bug", "feedback", "question"];

const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved"];

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

/** Roles sharing the non-admin pool. Admins get their own. */
const STAFF_ROLES = ["student", "fix"];

type CreateTicketInput = {
	category: TicketCategory;
	message: string;
};

type CreateTicketResult = { ok: true } | { ok: false; error: string };

/**
 * Files a ticket for the current user.
 *
 * `email` and `author_role` come from the session, never from the arguments —
 * server actions are public HTTP endpoints, so anything the client sends is
 * attacker-controlled. The role is snapshotted because it determines which pool
 * the ticket belongs to and must not shift if the author is promoted later.
 */
export async function createTicket(input: CreateTicketInput): Promise<CreateTicketResult> {
	const { email, role } = await requireUser();

	const message = input.message?.trim() ?? "";

	if (!CATEGORIES.includes(input.category)) {
		return { ok: false, error: "Please choose a valid category." };
	}
	if (message.length < MESSAGE_MIN) {
		return { ok: false, error: `Please write at least ${MESSAGE_MIN} characters.` };
	}
	if (message.length > MESSAGE_MAX) {
		return { ok: false, error: `Please keep it under ${MESSAGE_MAX} characters.` };
	}

	const { error } = await supabaseAdmin.from("tickets").insert({
		email,
		author_role: role,
		category: input.category,
		message,
	});

	if (error) {
		console.error("Error creating ticket:", error);
		return { ok: false, error: "Could not submit your report. Please try again." };
	}

	return { ok: true };
}

/**
 * Tickets visible to the current user: admins see the admin pool, everyone else
 * shares the staff pool.
 *
 * The returned rows carry no email. The list is shared with the whole pool, so
 * authors are identified by display name and ownership is resolved here against
 * the session rather than by handing addresses to the client.
 */
export async function getMyPoolTickets(): Promise<Ticket[]> {
	const { email, role } = await requireUser();

	const query = supabaseAdmin
		.from("tickets")
		.select("id, created_at, category, message, status, admin_response, email, User(first_name, nickname)")
		.order("created_at", { ascending: false })
		.limit(200);

	const { data, error } =
		role === "admin"
			? await query.eq("author_role", "admin")
			: await query.in("author_role", STAFF_ROLES);

	if (error) {
		console.error("Error fetching tickets:", error);
		return [];
	}

	type Row = {
		id: number;
		created_at: string;
		category: TicketCategory;
		message: string;
		status: TicketStatus;
		admin_response: string | null;
		email: string;
		User: { first_name: string | null; nickname: string | null } | null;
	};

	return (data as unknown as Row[]).map((row) => ({
		id: row.id,
		created_at: row.created_at,
		category: row.category,
		message: row.message,
		status: row.status,
		admin_response: row.admin_response,
		author_name: row.User?.nickname || row.User?.first_name || "Unknown",
		is_mine: row.email === email,
	}));
}

/**
 * Every ticket across both pools, for the triage view.
 *
 * Gated on `requireSupportAdmin` rather than `requireAdmin`: reading all pools
 * is exactly the thing the pool split exists to prevent for ordinary admins.
 */
export async function getAllTicketsForTriage(): Promise<TriageTicket[]> {
	await requireSupportAdmin();

	const { data, error } = await supabaseAdmin
		.from("tickets")
		.select(
			"id, created_at, category, message, status, admin_response, resolved_at, email, author_role, User(first_name, nickname)",
		)
		.order("created_at", { ascending: false })
		.limit(500);

	if (error) {
		console.error("Error fetching tickets for triage:", error);
		return [];
	}

	type Row = {
		id: number;
		created_at: string;
		category: TicketCategory;
		message: string;
		status: TicketStatus;
		admin_response: string | null;
		resolved_at: string | null;
		email: string;
		author_role: RoleName;
		User: { first_name: string | null; nickname: string | null } | null;
	};

	return (data as unknown as Row[]).map((row) => ({
		id: row.id,
		created_at: row.created_at,
		category: row.category,
		message: row.message,
		status: row.status,
		admin_response: row.admin_response,
		resolved_at: row.resolved_at,
		email: row.email,
		author_role: row.author_role,
		author_name: row.User?.nickname || row.User?.first_name || "Unknown",
	}));
}

type RespondInput = {
	admin_response: string;
	status: TicketStatus;
};

type RespondResult = { ok: true } | { ok: false; error: string };

/** Writes a reply and/or moves a ticket's status. Support allowlist only. */
export async function respondToTicket(id: number, input: RespondInput): Promise<RespondResult> {
	await requireSupportAdmin();

	if (!STATUSES.includes(input.status)) {
		return { ok: false, error: "Invalid status." };
	}

	const reply = input.admin_response?.trim() ?? "";

	const { error } = await supabaseAdmin
		.from("tickets")
		.update({
			admin_response: reply.length > 0 ? reply : null,
			status: input.status,
			// Keep resolved_at in step with status so the two can't disagree.
			resolved_at: input.status === "resolved" ? new Date().toISOString() : null,
		})
		.eq("id", id);

	if (error) {
		console.error("Error responding to ticket:", error);
		return { ok: false, error: "Could not save. Please try again." };
	}

	return { ok: true };
}

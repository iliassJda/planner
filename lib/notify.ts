import { Resend } from "resend";
import { developerEmails } from "@/lib/auth-guards";
import type { RoleName, TicketCategory } from "@/types";

/**
 * Outbound notifications for new support tickets.
 *
 * Server-only: it reads RESEND_API_KEY, which must never reach the browser.
 * Import it from server actions only — see the guard in utils/supabase/admin.ts
 * for what happens when a module like this is pulled into client code.
 *
 * Every function here fails soft. A notification is strictly less important
 * than the ticket it describes, so a broken mail pipeline must never cost a
 * user their report.
 */
if (typeof window !== "undefined") {
	throw new Error(
		"lib/notify.ts is server-only and was imported into client code. " +
			'Call a server action instead of importing this from a "use client" component.',
	);
}

const CATEGORY_LABEL: Record<TicketCategory, string> = {
	bug: "bug report",
	feedback: "feedback",
	question: "question",
};

/**
 * The app's own public origin.
 *
 * A server action has no `window`, so it cannot infer where it is being served
 * from. Vercel populates VERCEL_PROJECT_PRODUCTION_URL automatically, which
 * means APP_URL only needs setting for a custom domain.
 */
function appUrl(): string {
	if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
	// if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
	// 	return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
	// }
	return "http://localhost:3000";
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

type NewTicketInput = {
	ticketId: number;
	email: string;
	role: RoleName;
	category: TicketCategory;
	message: string;
};

export async function notifyNewTicket(input: NewTicketInput): Promise<void> {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.SUPPORT_FROM_EMAIL;
	const to = developerEmails();

	// Warn rather than fail silently: a misconfigured pipeline and "nobody has
	// filed a ticket yet" look identical from the outside otherwise.
	if (!apiKey) {
		console.warn("[notify] RESEND_API_KEY is not set — skipping ticket notification.");
		return;
	}
	if (!from) {
		console.warn("[notify] SUPPORT_FROM_EMAIL is not set — skipping ticket notification.");
		return;
	}
	if (to.length === 0) {
		console.warn("[notify] DEVELOPER_EMAILS is empty — nobody to notify about new tickets.");
		return;
	}

	const label = CATEGORY_LABEL[input.category] ?? "report";
	const triageUrl = `${appUrl()}/admin/support`;

	const text = [
		`New ${label} from ${input.email} (${input.role})`,
		"",
		input.message,
		"",
		`Ticket #${input.ticketId}`,
		`Open triage: ${triageUrl}`,
	].join("\n");

	const html = [
		`<p><strong>New ${escapeHtml(label)}</strong> from ${escapeHtml(input.email)} (${escapeHtml(input.role)})</p>`,
		`<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #d4d4d8;background:#fafafa;white-space:pre-wrap;">${escapeHtml(input.message)}</blockquote>`,
		`<p style="color:#71717a;font-size:13px;">Ticket #${input.ticketId}</p>`,
		`<p><a href="${triageUrl}">Open support triage</a></p>`,
	].join("");

	try {
		const { error } = await new Resend(apiKey).emails.send({
			from,
			to,
			subject: `[Planner] New ${label} from ${input.email}`,
			text,
			html,
		});

		// The SDK reports delivery problems in `error` rather than by throwing,
		// so an unverified domain or bad key would otherwise pass unnoticed.
		if (error) {
			console.error("[notify] Resend rejected the ticket notification:", error);
		}
	} catch (e) {
		console.error("[notify] Could not send ticket notification:", e);
	}
}

import { Bug, MessageSquare, HelpCircle } from "lucide-react";
import type { TicketCategory, TicketStatus } from "@/types";

/**
 * Shared label/styling for ticket badges, used by both the reporter-facing
 * /support page and the /admin/support triage view so the two never drift.
 */

export const TICKET_MESSAGE_MIN = 10;
export const TICKET_MESSAGE_MAX = 2000;

export const CATEGORY_META: Record<TicketCategory, { label: string; icon: typeof Bug }> = {
	bug: { label: "Bug", icon: Bug },
	feedback: { label: "Feedback", icon: MessageSquare },
	question: { label: "Question", icon: HelpCircle },
};

export const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
	open: { label: "Open", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
	in_progress: {
		label: "In progress",
		className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	},
	resolved: {
		label: "Resolved",
		className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	},
};

export const TICKET_STATUSES: TicketStatus[] = ["open", "in_progress", "resolved"];

export const TICKET_CATEGORIES: TicketCategory[] = ["bug", "feedback", "question"];

"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { getAllTicketsForTriage, respondToTicket } from "@/action/tickets";
import { getInitials, timeAgo } from "@/help_functions";
import { CATEGORY_META, STATUS_META, TICKET_STATUSES } from "@/lib/ticket-meta";
import { cn } from "@/lib/utils";
import type { TicketStatus, TriageTicket } from "@/types";

/** Unresolved work floats to the top; resolved history sinks below it. */
const STATUS_RANK: Record<TicketStatus, number> = {
	open: 0,
	in_progress: 1,
	resolved: 2,
};

type Draft = { reply: string; status: TicketStatus };

export default function SupportTriage() {
	const [tickets, setTickets] = useState<TriageTicket[]>([]);
	const [loading, setLoading] = useState(true);
	const [drafts, setDrafts] = useState<Record<number, Draft>>({});
	const [savingId, setSavingId] = useState<number | null>(null);

	const load = () =>
		getAllTicketsForTriage()
			.then((rows) => {
				setTickets(rows);
				// Reset drafts to whatever is now persisted, so the dirty check
				// below compares against the saved state rather than stale input.
				setDrafts(
					Object.fromEntries(
						rows.map((t) => [t.id, { reply: t.admin_response ?? "", status: t.status }]),
					),
				);
			})
			.catch(() => toast.error("Could not load tickets."))
			.finally(() => setLoading(false));

	useEffect(() => {
		load();
	}, []);

	const ordered = useMemo(
		() =>
			[...tickets].sort(
				(a, b) =>
					STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
			),
		[tickets],
	);

	const openCount = tickets.filter((t) => t.status !== "resolved").length;

	const handleSave = async (ticket: TriageTicket) => {
		const draft = drafts[ticket.id];
		if (!draft) return;

		setSavingId(ticket.id);
		try {
			const result = await respondToTicket(ticket.id, {
				admin_response: draft.reply,
				status: draft.status,
			});
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			toast.success("Saved");
			await load();
		} catch {
			toast.error("Could not save. Please try again.");
		} finally {
			setSavingId(null);
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-12 sm:px-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight md:text-3xl">Support triage</h1>
				<p className="mt-0.5 text-sm text-muted-foreground">
					All reports from every pool. {openCount} unresolved.
				</p>
			</div>

			{loading ? (
				<p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
			) : ordered.length === 0 ? (
				<div className="flex flex-col items-center gap-3 py-12 text-center">
					<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
						<Inbox className="h-6 w-6 text-muted-foreground" />
					</div>
					<p className="text-sm text-muted-foreground">No reports yet.</p>
				</div>
			) : (
				ordered.map((ticket) => {
					const meta = CATEGORY_META[ticket.category];
					const status = STATUS_META[ticket.status];
					const Icon = meta.icon;
					const draft = drafts[ticket.id] ?? {
						reply: ticket.admin_response ?? "",
						status: ticket.status,
					};
					const dirty =
						draft.reply !== (ticket.admin_response ?? "") || draft.status !== ticket.status;

					return (
						<Card key={ticket.id} className={cn(ticket.status !== "resolved" && "border-primary/30")}>
							<CardContent className="flex flex-col gap-3 pt-6">
								{/* Reporter */}
								<div className="flex flex-wrap items-center gap-2">
									<Avatar className="h-6 w-6 shrink-0 border">
										<AvatarFallback className="bg-primary/5 text-[9px] font-bold text-primary">
											{getInitials(ticket.author_name)}
										</AvatarFallback>
									</Avatar>
									<span className="text-sm font-semibold">{ticket.author_name}</span>
									<span className="text-xs text-muted-foreground">{ticket.email}</span>
									<Badge variant="outline" className="text-[10px] capitalize">
										{ticket.author_role}
									</Badge>
									<Badge variant="secondary" className="gap-1 text-[10px]">
										<Icon className="h-3 w-3" />
										{meta.label}
									</Badge>
									<Badge
										variant="outline"
										className={cn("border-transparent text-[10px]", status.className)}
									>
										{status.label}
									</Badge>
									<span className="ml-auto text-xs text-muted-foreground">
										{timeAgo(ticket.created_at)}
									</span>
								</div>

								<p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.message}</p>

								{/* Reply + status. The box is prefilled with what's saved, so
								    revising an existing reply is just editing and saving again. */}
								<div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
									<Textarea
										value={draft.reply}
										onChange={(e) =>
											setDrafts((prev) => ({
												...prev,
												[ticket.id]: { ...draft, reply: e.target.value },
											}))
										}
										placeholder="Write a reply — everyone in this pool will see it."
										className="min-h-20 resize-y bg-background"
									/>
									<div className="flex items-center justify-between gap-3">
										<Select
											value={draft.status}
											onValueChange={(v) =>
												setDrafts((prev) => ({
													...prev,
													[ticket.id]: { ...draft, status: v as TicketStatus },
												}))
											}
										>
											<SelectTrigger className="w-40 bg-background">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{TICKET_STATUSES.map((s) => (
													<SelectItem key={s} value={s}>
														{STATUS_META[s].label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<Button
											size="sm"
											onClick={() => handleSave(ticket)}
											disabled={!dirty || savingId === ticket.id}
										>
											<Save className="mr-1.5 h-3.5 w-3.5" />
											{savingId === ticket.id ? "Saving…" : "Save"}
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})
			)}
		</div>
	);
}

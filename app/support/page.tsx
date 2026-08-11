"use client";

import { useEffect, useState } from "react";
import { Send, Inbox } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { createTicket, getMyPoolTickets } from "@/action/tickets";
import { useUser } from "@/context/user-context";
import { getInitials, timeAgo } from "@/help_functions";
import { cn } from "@/lib/utils";
import {
	CATEGORY_META,
	STATUS_META,
	TICKET_CATEGORIES,
	TICKET_MESSAGE_MAX,
	TICKET_MESSAGE_MIN,
} from "@/lib/ticket-meta";
import type { Ticket, TicketCategory } from "@/types";

const MESSAGE_MIN = TICKET_MESSAGE_MIN;
const MESSAGE_MAX = TICKET_MESSAGE_MAX;

export default function SupportPage() {
	const user = useUser();

	const [tickets, setTickets] = useState<Ticket[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [category, setCategory] = useState<TicketCategory>("bug");
	const [message, setMessage] = useState("");

	const load = () =>
		getMyPoolTickets()
			.then(setTickets)
			.catch(() => toast.error("Could not load reports."))
			.finally(() => setLoading(false));

	useEffect(() => {
		load();
	}, []);

	const trimmed = message.trim();
	const tooShort = trimmed.length > 0 && trimmed.length < MESSAGE_MIN;
	const canSubmit = trimmed.length >= MESSAGE_MIN && trimmed.length <= MESSAGE_MAX && !submitting;

	const handleSubmit = async () => {
		if (!canSubmit) return;
		setSubmitting(true);
		try {
			const result = await createTicket({ category, message: trimmed });
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			toast.success("Report submitted — thanks!");
			setMessage("");
			setCategory("bug");
			await load();
		} catch {
			toast.error("Could not submit your report. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	// Everyone in a pool reads the same list, so say so plainly rather than
	// letting anyone mistake this for a private channel to the manager.
	const audienceNote =
		user?.role === "admin" ? "Visible to other admins" : "Visible to other students";

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-12 sm:px-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight md:text-3xl">Support</h1>
				<p className="mt-0.5 text-sm text-muted-foreground">
					Report a bug or send feedback about the planner.
				</p>
			</div>

			{/* Report form */}
			<Card>
				<CardHeader className="pb-4">
					<CardTitle className="text-base">New report</CardTitle>
					<CardDescription>{audienceNote}</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
						<SelectTrigger className="w-full sm:w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{TICKET_CATEGORIES.map((key) => (
								<SelectItem key={key} value={key}>
									{CATEGORY_META[key].label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="What happened? If it's a bug, what were you doing just before it went wrong?"
						className="min-h-32 resize-y"
						maxLength={MESSAGE_MAX}
					/>

					<div className="flex items-center justify-between gap-3">
						<span
							className={cn(
								"text-xs",
								tooShort ? "text-destructive" : "text-muted-foreground",
							)}
						>
							{tooShort
								? `At least ${MESSAGE_MIN} characters.`
								: `${trimmed.length} / ${MESSAGE_MAX}`}
						</span>
						<Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
							<Send className="mr-1.5 h-3.5 w-3.5" />
							{submitting ? "Sending…" : "Submit"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Existing reports */}
			<div className="flex flex-col gap-3">
				<h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					Reports
				</h2>

				{loading ? (
					<p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
				) : tickets.length === 0 ? (
					<div className="flex flex-col items-center gap-3 py-12 text-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
							<Inbox className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="text-sm text-muted-foreground">
							No reports yet — yours would be the first.
						</p>
					</div>
				) : (
					tickets.map((ticket) => {
						const meta = CATEGORY_META[ticket.category];
						const status = STATUS_META[ticket.status];
						const Icon = meta.icon;

						return (
							<Card key={ticket.id} className={cn(ticket.is_mine && "border-primary/40")}>
								<CardContent className="flex flex-col gap-3 pt-6">
									<div className="flex flex-wrap items-center gap-2">
										<Avatar className="h-6 w-6 shrink-0 border">
											<AvatarFallback className="bg-primary/5 text-[9px] font-bold text-primary">
												{getInitials(ticket.author_name)}
											</AvatarFallback>
										</Avatar>
										<span className="text-sm font-semibold">{ticket.author_name}</span>
										{ticket.is_mine && (
											<Badge variant="outline" className="text-[10px]">
												You
											</Badge>
										)}
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

									{ticket.admin_response && (
										<div className="rounded-lg border-l-2 border-l-primary bg-muted/40 px-3 py-2">
											<p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
												Reply
											</p>
											<p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
												{ticket.admin_response}
											</p>
										</div>
									)}
								</CardContent>
							</Card>
						);
					})
				)}
			</div>
		</div>
	);
}

"use client";

import { useState } from "react";
import { CalendarPlus, Copy, Check } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getIcalToken } from "@/action/supabase";
import { toast } from "sonner";

export default function IcalSubscribeButton({ email }: { email: string }) {
	const [url, setUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleOpenChange = async (open: boolean) => {
		if (!open || url || loading) return;
		setLoading(true);
		try {
			const token = await getIcalToken();
			if (!token) {
				toast.error("Could not load your calendar link");
				return;
			}
			setUrl(`${window.location.origin}/api/ical/${token}`);
		} finally {
			setLoading(false);
		}
	};

	const handleCopy = async () => {
		if (!url) return;
		await navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Dialog onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="inline-flex items-center gap-1.5 text-sm font-medium"
				>
					<CalendarPlus className="h-4 w-4" />
					<span className="hidden sm:inline">Subscribe</span>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Subscribe to your calendar</DialogTitle>
					<DialogDescription>
						Add this link to Apple Calendar, Google Calendar, or Outlook to keep your shifts
						synced automatically. Keep it private — anyone with the link can see your schedule.
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center gap-2">
					<Input readOnly value={loading ? "Loading…" : url ?? ""} onFocus={(e) => e.target.select()} />
					<Button size="icon" variant="outline" onClick={handleCopy} disabled={!url}>
						{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
					</Button>
				</div>
				{url && (
					<a
						href={url.replace(/^https?:\/\//, "webcal://")}
						className="text-sm text-primary underline underline-offset-4"
					>
						Open directly in your calendar app
					</a>
				)}
			</DialogContent>
		</Dialog>
	);
}

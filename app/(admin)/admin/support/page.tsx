import { getCurrentUser, isDeveloperEmail } from "@/lib/auth-guards";
import SupportTriage from "./support-triage";

/**
 * Triage lives behind DEVELOPER_EMAILS rather than the admin role: the
 * ticket pools exist so the manager never reads student reports, and opening
 * this to every admin would undo that. The gate here only decides what to
 * render — the server actions enforce it independently.
 */
export default async function SupportTriagePage() {
	const user = await getCurrentUser();

	if (!user || !isDeveloperEmail(user.email)) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="flex flex-col items-center gap-2 rounded-lg border bg-muted p-8 text-center">
					<h2 className="text-xl font-bold">Support triage</h2>
					<p className="text-sm text-muted-foreground">
						This area is not available for your account.
					</p>
				</div>
			</div>
		);
	}

	return <SupportTriage />;
}

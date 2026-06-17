import WeeklyPlanner from "./weekly-planner";
import { auth } from "@/auth";

export default async function MakerPage() {
	const isDev = process.env.NODE_ENV === "development";
	const betaEmails = (process.env.PLANNER_BETA_EMAILS ?? "")
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);

	let isBetaUser = false;
	if (betaEmails.length > 0) {
		const session = await auth();
		isBetaUser = betaEmails.includes(session?.user?.email?.toLowerCase() ?? "");
	}

	if (isDev || isBetaUser) {
		return <WeeklyPlanner />;
	}
	return (
		<div className="flex h-full items-center justify-center">
			<div className="flex flex-col items-center gap-4 rounded-lg border bg-muted p-8">
				<h2 className="text-2xl font-bold">Planning maker</h2>
				<p className="text-muted-foreground">
					This page is under construction. Please check back later.
				</p>
			</div>
		</div>
	);
}

import WeeklyPlanner from "./weekly-planner";

/**
 * AI schedule generation runs as a server action on this route and has measured
 * at 100–150s. Without this the platform kills the function at its default (10s
 * on Vercel Hobby, 60s on Pro) and the admin just sees "Failed to generate
 * planning" with no indication it was a timeout. 300s is the platform maximum.
 */
export const maxDuration = 300;

export default async function MakerPage() {
	// const isDev = process.env.NODE_ENV === "development";
	// const betaEmails = (process.env.PLANNER_BETA_EMAILS ?? "")
	// 	.split(",")
	// 	.map((e) => e.trim().toLowerCase())
	// 	.filter(Boolean);

	// let isBetaUser = false;
	// if (betaEmails.length > 0) {
	// 	const session = await auth();
	// 	isBetaUser = betaEmails.includes(session?.user?.email?.toLowerCase() ?? "");
	// }

	return <WeeklyPlanner />;

	// if (isDev || isBetaUser) {
	// 	return <WeeklyPlanner />;
	// }
	// return (
	// 	<div className="flex h-full items-center justify-center">
	// 		<div className="flex flex-col items-center gap-4 rounded-lg border bg-muted p-8">
	// 			<h2 className="text-2xl font-bold">Planning maker</h2>
	// 			<p className="text-muted-foreground">
	// 				This page is under construction. Please check back later.
	// 			</p>
	// 		</div>
	// 	</div>
	// );
}

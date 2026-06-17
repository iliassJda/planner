// import { getAllAvailability, getAllWeeks } from "@/action/supabase";
// import DropArea from "./drop-area";
import MakerWrapper from "./maker-wrapper";
import WeeklyPlanner from "./weekly-planner";
// import MakerClient from "./maker-client";

export default async function MakerPage() {
	const isDev = process.env.NODE_ENV === "development";
	// return <MakerWrapper />;
	if (isDev) {
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

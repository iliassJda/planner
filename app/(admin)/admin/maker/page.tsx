// import { getAllAvailability, getAllWeeks } from "@/action/supabase";
import DropArea from "./drop-area";
// import MakerClient from "./maker-client";

export default async function MakerPage() {
	return (
		<div className="w-full h-full">
			<h1 className="text-2xl font-bold md:text-3xl">Planner Making</h1>
			<DropArea />
		</div>
	);
}

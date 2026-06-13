// import { getAllAvailability, getAllWeeks } from "@/action/supabase";
// import DropArea from "./drop-area";
import MakerWrapper from "./maker-wrapper";
import WeeklyPlanner from "./weekly-planner";
// import MakerClient from "./maker-client";

export default async function MakerPage() {
	// return <MakerWrapper />;
	return <WeeklyPlanner file={null} />;
}

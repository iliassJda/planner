import { redirect } from "next/navigation";
import { getPlanningPageData } from "@/action/supabase";

export default async function PlanningRedirect() {
	const data = await getPlanningPageData();
	if (!data) redirect("/dashboard");
	redirect(`/planning/${encodeURIComponent(data.week.week_label)}`);
}

import NavMain from "./nav-main";
import { SidebarContent } from "@/components/ui/sidebar";
import { RoleName } from "@/types";
import { NavFeedback } from "./nav-feedback";
import { feedbackData } from "@/lib/sidebar_data";

export default function Content({ role }: { role: RoleName }) {
	// console.log("This is the admin boolean = ", admin);
	return (
		<SidebarContent>
			<NavMain role={role} />
			<NavFeedback items={feedbackData.navFeedback} className="mt-auto" />
		</SidebarContent>
	);
}

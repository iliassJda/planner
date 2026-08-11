import { LifeBuoy, Send } from "lucide-react";

const userData = {
	navMain: [
		{
			title: "Dashboard",
			url: "/dashboard",
		},
		{
			title: "Planning",
			url: "/planning",
		},
	],
};

const adminData = {
	navMain: [
		{
			title: "Dashboard",
			url: "/admin",
		},
		{
			title: "User Management",
			url: "/admin/all-users",
		},
		{
			title: "Availability Overview",
			url: "/admin/data",
		},
		{
			title: "Planning Maker",
			url: "/admin/maker",
		},
	],
};

const feedbackData = {
	navFeedback: [
		{
			title: "Support",
			url: "/support",
			icon: LifeBuoy,
		},
		// {
		// 	title: "Suggest a Feature",
		// 	url: "/feedback/feature",
		// },
	],
};

export { userData, adminData, feedbackData };

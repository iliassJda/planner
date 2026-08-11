"use client";
import * as React from "react";
// import { GalleryVerticalEnd } from "lucide-react";
import Image from "next/image";

import {
	Sidebar,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarFooter,
	SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { NavUser } from "./nav-user";
import Content from "./sidebar-content";

// The data for the sidebar comes from here
// import { userData } from "@/lib/sidebar_data";
import { useUser } from "@/context/user-context";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const user = useUser();

	if (user === null) {
		return null;
	}
	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/dashboard">
								<Image src="/neuhausSmall.png" alt="Neuhaus Image" width={30} height={30} />
								<div className="flex flex-col gap-0.5 leading-none">
									<span className="font-medium">Student Planner</span>
									{/* <span className="">v1.0.0</span> */}
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<Content role={user.role} />
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

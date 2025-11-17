"use client";
import * as React from "react";
// import { GalleryVerticalEnd } from "lucide-react";
import Image from "next/image";

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarFooter,
	SidebarRail,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { NavUser } from "./nav-user";

// The data for the sidebar comes from here
import { data } from "@/lib/sidebar_data";
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
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						{data.navMain.map((item) => (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton asChild>
									<a href={item.url} className="font-medium">
										{item.title}
									</a>
								</SidebarMenuButton>
								{/* {item.items?.length ? (
									<SidebarMenuSub>
										{item.items.map((item) => (
											<SidebarMenuSubItem key={item.title}>
												<SidebarMenuSubButton asChild isActive={item.isActive}>
													<a href={item.url}>{item.title}</a>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										))}
									</SidebarMenuSub>
								) : null} */}
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

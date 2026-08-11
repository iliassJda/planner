import { auth } from "@/auth";
import { Region, User } from "@/types";
import { redirect } from "next/navigation";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import ToggleButton from "@/components/toggle-theme-button";
import UserProvider from "@/provider/user-provider";
import React from "react";

import { getAllowData } from "@/action/supabase";
import Restricted from "@/components/access-restricted";

/**
 * Support lives outside the (admin) and (user) route groups on purpose: the
 * (user) layout redirects admins to /admin, so a shared page placed there is
 * unreachable for them. This layout admits any approved role instead.
 */
export default async function SupportLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await auth();

	if (!session?.user) {
		redirect("/login");
	}

	const user: User = {
		email: session.user.email as string,
		nickname: "" as string,
		first_name: session.user.name?.split(" ")[0] as string,
		image: session.user.image as string,
		role: "student",
		region: { id: 1, name: "Bruxelles" } as Region,
	};

	const data = await getAllowData();

	if (data == null) {
		return Restricted({ user });
	}

	// Unlike the (admin)/(user) layouts, carry the resolved role through so the
	// sidebar renders the right nav for whoever is actually signed in.
	user.role = data.role;

	// NotificationBell is intentionally absent: it calls getNotifications(),
	// which is admin-guarded and would throw for a student on this page.
	return (
		<SidebarProvider>
			<UserProvider user={user}>
				<AppSidebar />
				<SidebarInset className="min-w-0">
					<header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b">
						<div className="flex items-center gap-2 px-3">
							<SidebarTrigger />
							<Separator orientation="vertical" className="mr-2 h-4" />
						</div>
						<ToggleButton />
					</header>
					<div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
				</SidebarInset>
			</UserProvider>
		</SidebarProvider>
	);
}

import { auth } from "@/auth";
import { Region, User } from "@/types";
import { redirect } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import ToggleButton from "@/components/toggle-theme-button";
// import { Button } from "@/components/ui/button";

// import { Moon, Sun } from "lucide-react";
// import { useTheme } from "next-themes";

import UserProvider from "@/provider/user-provider";
import React from "react";
// import Link from "next/link";

import { getAllowData } from "@/action/supabase";
import Restricted from "@/components/access-restricted";
import NotificationBell from "@/components/notification-bell";

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await auth();
	// const { setTheme, theme } = useTheme();

	if (!session?.user) {
		redirect("/login");
	}

	const user: User = {
		email: session.user.email as string,
		nickname: "" as string, // Nickname is not currently stored in the session, so we initialize it as an empty string. It can be updated later when we fetch user data from the database.
		first_name: session.user.name?.split(" ")[0] as string,
		image: session.user.image as string,
		role: "student",
		region: { id: 1, name: "Bruxelles" } as Region, // Region is hardcoded for now but should not be
	};
	// console.log(user);
	// This gets the data to check whether the user is allowed on the website by checking the
	// allowed column in supabase
	const data = await getAllowData();

	if (data == null || data.role !== "admin") {
		return Restricted({ user });
	}

	user.role = "admin";

	//Check for admin !

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
						<div className="flex items-center gap-1 px-3">
							<NotificationBell />
							<ToggleButton />
						</div>
					</header>
					<div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
				</SidebarInset>
			</UserProvider>
		</SidebarProvider>
	);
}

import { auth } from "@/auth";
import { User } from "@/types";
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
		name: session.user.name as string,
		image: session.user.image as string,
		admin: false,
	};
	// console.log(user);
	// This gets the data to check whether the user is allowed on the website by checking the
	// allowed column in supabase
	const data = await getAllowData(user);

	if (data == null || !data.admin) {
		return Restricted({ user });
	}

	user.admin = true;

	// if (!data.admin) {
	// 	redirect("/");
	// }

	//Check for admin !

	return (
		<SidebarProvider>
			<UserProvider user={user}>
				<AppSidebar />
				<SidebarInset>
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

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  // const { setTheme, theme } = useTheme();

  if (!session) {
    redirect("/login");
  }

  const user = session.user as User;

  return (
    <SidebarProvider>
      <UserProvider user={user}>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b">
            <div className="flex items-center gap-2 px-3">
              <SidebarTrigger />
              {/* <Separator orientation="vertical" className="mr-2 h-4" /> */}
              {/* <Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem className="hidden md:block">
									<BreadcrumbLink href="#">Building Your Application</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator className="hidden md:block" />
								<BreadcrumbItem>
									<BreadcrumbPage>Data Fetching</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb> */}
            </div>
            <ToggleButton />
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            {/* {React.cloneElement(children as React.ReactElement<{ user?: User }>, { user })} */}
            {/* <UserProvider user={user}>{children}</UserProvider> */}
            {children}
          </div>
        </SidebarInset>
      </UserProvider>
    </SidebarProvider>
  );
}

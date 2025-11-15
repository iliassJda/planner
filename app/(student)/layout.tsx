import { auth } from "@/auth";
import { User } from "@/types";
import { redirect } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { AppSidebar } from "@/components/app-sidebar";

import React from "react";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  console.log(session?.user as User, "Is the session");
  if (!session) {
    redirect("/login");
  }

  const user = session.user as User;

  const childrenWithSession = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // Cast child to a React element that accepts a 'user' prop so cloneElement is type-safe
      return React.cloneElement(child as React.ReactElement<{ user?: User }>, { user });
    }
    return child;
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Building Your Application</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{childrenWithSession}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

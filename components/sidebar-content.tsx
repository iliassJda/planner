import {
	SidebarContent,
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { userData, adminData } from "@/lib/sidebar_data";

export default function Content({ admin }: { admin: boolean }) {
	// console.log("This is the admin boolean = ", admin);
	return (
		<SidebarContent>
			<SidebarGroup>
				<SidebarMenu>
					{admin
						? adminData.navMain.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild>
										<a href={item.url} className="font-medium">
											{item.title}
										</a>
									</SidebarMenuButton>
								</SidebarMenuItem>
						  ))
						: userData.navMain.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild>
										<a href={item.url} className="font-medium">
											{item.title}
										</a>
									</SidebarMenuButton>
								</SidebarMenuItem>
						  ))}
				</SidebarMenu>
			</SidebarGroup>
		</SidebarContent>
	);
}

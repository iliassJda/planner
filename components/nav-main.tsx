import {
	SidebarContent,
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { userData, adminData } from "@/lib/sidebar_data";
import { RoleName } from "@/types";

export default function NavMain({ role }: { role: RoleName }) {
	return (
		<SidebarGroup>
			<SidebarMenu>
				{role == "admin"
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
	);
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Calendar, Users } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				{/* <Settings className="h-6 w-6" /> */}
				<h1 className="text-2xl font-bold">Admin Dashboard</h1>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Calendar className="h-5 w-5" />
							Week Management
						</CardTitle>
						<CardDescription>Register and manage weeks for availability collection</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild className="w-full" variant="default">
							<Link href="/admin/set-weeks">Manage Weeks</Link>
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users className="h-5 w-5" />
							User Management
						</CardTitle>
						<CardDescription>Manage user permissions and access</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="outline" className="w-full" disabled>
							Coming Soon
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Quick Stats</CardTitle>
						<CardDescription>Overview of the system</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Total Users:</span>
								<span className="font-medium">--</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Active Weeks:</span>
								<span className="font-medium">--</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

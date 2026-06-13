"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Users,
	UserCheck,
	UserX,
	Shield,
	ShieldCheck,
	Crown,
	CheckCircle,
	XCircle,
	MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { RoleName, User } from "@/types";
import { getAllUsers, updateUserPermissions, updateUserStatus } from "@/action/supabase";
import UserSkeleton from "@/components/user-skeleton";

import { getInitials } from "@/help_functions";

export default function AllUsersPage() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [updatingUser, setUpdatingUser] = useState<string | null>(null);
	const [confirmAction, setConfirmAction] = useState<{
		user: User;
		action: "accept" | "reject" | "makeAdmin" | "removeAdmin" | "makeFix" | "removeFix";
	} | null>(null);

	const fetchUsers = async () => {
		const userData = await getAllUsers();
		setUsers(userData);
		setLoading(false);
	};

	useEffect(() => {
		fetchUsers();
	}, []);

	const handleUpdateUserStatus = async (email: string, allowed: boolean) => {
		setUpdatingUser(email);
		try {
			const result = await updateUserStatus(email, allowed);
			if (result) {
				toast.success(`User ${allowed ? "accepted" : "rejected"} successfully`);
				await fetchUsers();
			} else {
				toast.error("Failed to update user status");
			}
		} catch (error) {
			console.error("Error updating user status:", error);
			toast.error("Failed to update user status");
		} finally {
			setUpdatingUser(null);
		}
	};

	const handleUpdateUserPermissions = async (email: string, role: RoleName) => {
		setUpdatingUser(email);
		try {
			const result = await updateUserPermissions(email, role);
			if (result) {
				toast.success(
					`User ${role != "student" ? "promoted to" : "removed from"} ${role} successfully`,
				);
				await fetchUsers();
			} else {
				toast.error("Failed to update user permissions");
			}
		} catch (error) {
			console.error("Error updating user permissions:", error);
			toast.error("Failed to update user permissions");
		} finally {
			setUpdatingUser(null);
		}
	};

	const handleConfirmAction = async () => {
		if (!confirmAction) return;

		const { user, action } = confirmAction;
		setConfirmAction(null);

		switch (action) {
			case "accept":
				await handleUpdateUserStatus(user.email, true);
				break;
			// case "acceptAsFix":
			// 	await handleUpdateUserStatus(user.email, true);
			// 	await handleUpdateUserPermissions(user.email, "fix");
			// 	break;
			case "reject":
				await handleUpdateUserStatus(user.email, false);
				break;
			case "makeAdmin":
				await handleUpdateUserPermissions(user.email, "admin");
				break;
			case "removeAdmin":
				await handleUpdateUserPermissions(user.email, "student");
				break;
			case "makeFix":
				await handleUpdateUserPermissions(user.email, "fix");
				break;
			case "removeFix":
				await handleUpdateUserPermissions(user.email, "student");
				break;
		}
	};

	const getActionText = (action: string) => {
		switch (action) {
			case "accept":
				return "accept";
			case "reject":
				return "reject";
			case "makeAdmin":
				return "promote to admin";
			case "removeAdmin":
				return "remove admin privileges from";
			case "makeFix":
				return "promote to fix";
			case "removeFix":
				return "remove fix privileges from";
			default:
				return "";
		}
	};

	const pendingUsers = users.filter((user) => !user.allowed);
	const activeUsers = users.filter((user) => user.allowed);

	const adminUsers = activeUsers.filter((user) => user.role === "admin");
	const fixUsers = activeUsers.filter((user) => user.role === "fix");
	const regularUsers = activeUsers.filter((user) => user.role === "student");

	// console.log("All users:", users);

	if (loading) {
		return <UserSkeleton />;
	}

	return (
		<div className="flex flex-col gap-6 p-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold md:text-3xl">User Management</h1>
				<p className="text-muted-foreground">
					Manage user permissions and access to the application
				</p>
			</div>

			{/* Stats Cards */}
			<div className="w-full flex gap-4 overflow-x-auto pb-2 items-stretch">
				<Card className="min-w-[200px] flex-shrink-0 flex-1">
					<CardContent className="flex items-center gap-4 pt-6">
						<div className="rounded-lg p-3">
							<Users className="h-6 w-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">{users.length}</p>
							<p className="text-sm text-muted-foreground">Total users</p>
						</div>
					</CardContent>
				</Card>
				<Card className="min-w-[200px] flex-shrink-0 flex-1">
					<CardContent className="flex items-center gap-4 pt-6">
						<div className="rounded-lg p-3 text-green-600 dark:bg-green-950/30 dark:text-green-400">
							<UserCheck className="h-6 w-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">{regularUsers.length}</p>
							<p className="text-sm text-muted-foreground">Students</p>
						</div>
					</CardContent>
				</Card>
				<Card className="min-w-[200px] flex-shrink-0 flex-1">
					<CardContent className="flex items-center gap-4 pt-6">
						<div className="rounded-lg p-3 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400">
							<Shield className="h-6 w-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">{fixUsers.length}</p>
							<p className="text-sm text-muted-foreground">Employees</p>
						</div>
					</CardContent>
				</Card>
				<Card className="min-w-[200px] flex-shrink-0 flex-1">
					<CardContent className="flex items-center gap-4 pt-6">
						<div className="rounded-lg p-3 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
							<Crown className="h-6 w-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">{adminUsers.length}</p>
							<p className="text-sm text-muted-foreground">Admins</p>
						</div>
					</CardContent>
				</Card>
				<Card className="min-w-[200px] flex-shrink-0 flex-1">
					<CardContent className="flex items-center gap-4 pt-6">
						<div className="rounded-lg p-3 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
							<UserX className="h-6 w-6" />
						</div>
						<div>
							<p className="text-2xl font-bold">{pendingUsers.length}</p>
							<p className="text-sm text-muted-foreground">Pending</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Pending Users */}
			{pendingUsers.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserX className="h-5 w-5 text-orange-600 dark:text-orange-400" />
							Pending Approval ({pendingUsers.length})
						</CardTitle>
						<CardDescription>Users waiting for access approval</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{pendingUsers.map((user) => (
							<div
								key={user.email}
								className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4"
							>
								<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
									<Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
										<AvatarImage
											src={user.image}
											alt={user.first_name}
											referrerPolicy="no-referrer"
										/>
										<AvatarFallback className="text-xs sm:text-sm">
											{getInitials(user.first_name)}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<p className="font-medium text-sm sm:text-base truncate">{user.first_name}</p>
										<p className="text-xs sm:text-sm text-muted-foreground truncate">
											{user.email}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2 flex-shrink-0">
									<Button
										variant="outline"
										size="sm"
										// className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 text-xs sm:text-sm px-2 sm:px-3"
										onClick={() => setConfirmAction({ user, action: "accept" })}
										disabled={updatingUser === user.email}
									>
										{updatingUser === user.email ? (
											"Processing..."
										) : (
											<>
												<CheckCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
												<span className="hidden sm:inline">Accept</span>
												<span className="sm:hidden">✓</span>
											</>
										)}
									</Button>
									<Button
										variant="outline"
										size="sm"
										// className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 text-xs sm:text-sm px-2 sm:px-3"
										onClick={() => setConfirmAction({ user, action: "reject" })}
										disabled={updatingUser === user.email}
									>
										<XCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
										<span className="hidden sm:inline">Reject</span>
										<span className="sm:hidden">✗</span>
									</Button>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* Active Users */}
			<div className="grid gap-6 xl:grid-cols-3">
				{/* Administrators */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Crown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							Administrators ({adminUsers.length})
						</CardTitle>
						<CardDescription>Users with administrative privileges</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{adminUsers.length === 0 ? (
							<p className="text-sm text-muted-foreground">No administrators found</p>
						) : (
							adminUsers.map((user) => (
								<div
									key={user.email}
									className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4"
								>
									<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
										<Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
											<AvatarImage
												src={user.image}
												alt={user.first_name}
												referrerPolicy="no-referrer"
											/>
											<AvatarFallback className="text-xs sm:text-sm">
												{getInitials(user.first_name)}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="font-medium text-sm sm:text-base truncate">
													{user.first_name}
												</p>
											</div>
											<p className="text-xs sm:text-sm text-muted-foreground truncate">
												{user.email}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2 flex-shrink-0">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0"
													disabled={updatingUser === user.email}
												>
													<span className="sr-only">Open menu</span>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-[160px]">
												<DropdownMenuItem
													onClick={() => setConfirmAction({ user, action: "removeAdmin" })}
												>
													<UserX className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
													<span>Remove Admin</span>
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>

				{/* Fix Users */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
							Employees ({fixUsers.length})
						</CardTitle>
						<CardDescription>Employees with schedule fix privileges</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{fixUsers.length === 0 ? (
							<p className="text-sm text-muted-foreground">No fixers found</p>
						) : (
							fixUsers.map((user) => (
								<div
									key={user.email}
									className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4"
								>
									<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
										<Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
											<AvatarImage
												src={user.image}
												alt={user.first_name}
												referrerPolicy="no-referrer"
											/>
											<AvatarFallback className="text-xs sm:text-sm">
												{getInitials(user.first_name)}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<p className="font-medium text-sm sm:text-base truncate">{user.first_name}</p>
											<p className="text-xs sm:text-sm text-muted-foreground truncate">
												{user.email}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2 flex-shrink-0">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0"
													disabled={updatingUser === user.email}
												>
													<span className="sr-only">Open menu</span>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-[160px]">
												<DropdownMenuItem
													onClick={() => setConfirmAction({ user, action: "makeAdmin" })}
												>
													<Crown className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
													<span>Make Admin</span>
												</DropdownMenuItem>
												{/* <DropdownMenuItem
													onClick={() => setConfirmAction({ user, action: "makeFix" })}
												>
													<Shield className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
													<span>Make Fixer</span>
												</DropdownMenuItem> */}
												{/* <DropdownMenuSeparator /> */}
												<DropdownMenuItem
													// className="text-orange-600 focus:bg-orange-50 focus:text-orange-700 dark:text-orange-400 dark:focus:bg-orange-900/20 dark:focus:text-orange-300"
													onClick={() => setConfirmAction({ user, action: "removeFix" })}
												>
													<UserX className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
													<span>Remove Employee Role</span>
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													// className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-900/20 dark:focus:text-red-300"
													onClick={() => setConfirmAction({ user, action: "reject" })}
												>
													<XCircle className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
													<span>Revoke Access</span>
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>

				{/* Regular Users */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
							Students ({regularUsers.length})
						</CardTitle>
						<CardDescription>Students with standard permissions</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{regularUsers.length === 0 ? (
							<p className="text-sm text-muted-foreground">No regular users found</p>
						) : (
							regularUsers.map((user) => (
								<div
									key={user.email}
									className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4"
								>
									<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
										<Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
											<AvatarImage
												src={user.image}
												alt={user.first_name}
												referrerPolicy="no-referrer"
											/>
											<AvatarFallback className="text-xs sm:text-sm">
												{getInitials(user.first_name)}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<p className="font-medium text-sm sm:text-base truncate">{user.first_name}</p>
											<p className="text-xs sm:text-sm text-muted-foreground truncate">
												{user.email}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2 flex-shrink-0">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0"
													disabled={updatingUser === user.email}
												>
													<span className="sr-only">Open menu</span>
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-[160px]">
												<DropdownMenuItem
													onClick={() => setConfirmAction({ user, action: "makeAdmin" })}
												>
													<ShieldCheck className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
													<span>Make Admin</span>
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => setConfirmAction({ user, action: "makeFix" })}
												>
													<ShieldCheck className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
													<span>Make Fix</span>
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													// className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-900/20 dark:focus:text-red-300"
													onClick={() => setConfirmAction({ user, action: "reject" })}
												>
													<UserX className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
													<span>Revoke Access</span>
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>
			</div>

			{/* Confirmation Dialog */}
			<Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm Action</DialogTitle>
						<DialogDescription>
							Are you sure you want to {getActionText(confirmAction?.action || "")}{" "}
							<strong>{confirmAction?.user?.first_name}</strong> ? <br />
							{(confirmAction?.action === "reject" || confirmAction?.action === "removeAdmin") && (
								<strong>This action will affect their access to the application.</strong>
							)}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setConfirmAction(null)}>
							Cancel
						</Button>
						<Button
							variant={
								confirmAction?.action === "reject" || confirmAction?.action === "removeAdmin"
									? "destructive"
									: "default"
							}
							onClick={handleConfirmAction}
							disabled={!!updatingUser}
						>
							{updatingUser ? "Processing..." : "Confirm"}
						</Button>
						{/* <Button
							variant="secondary"
							onClick={handleConfirmAction}
							disabled={!!updatingUser}
						>
							{updatingUser ? "Processing..." : "Confirm as Employee"}
						</Button> */}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

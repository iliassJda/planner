"use client";

import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
	Pencil,
	UserPlus,
	Store,
	Clock3,
	RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { RoleName, Store as StoreType, User } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	getAllUsers,
	updateUserPermissions,
	updateUserStatus,
	changeNickname,
	createEmployee,
	getStoresForApp,
	assignUserStore,
	getTimetable,
	saveTimetable,
} from "@/action/supabase";
import { TimetableEntry } from "@/types";
import UserSkeleton from "@/components/user-skeleton";

import { getInitials } from "@/help_functions";

type MenuAction = "admin" | "fix" | "student";

function getOptions(
	user: User,
	updatingUser: string | null,
	setConfirmAction: Dispatch<
		SetStateAction<{
			user: User;
			action: "accept" | "reject" | "makeAdmin" | "removeAdmin" | "makeFix" | "removeFix";
		} | null>
	>,
	menuType: MenuAction,
	setAssigningStore: Dispatch<SetStateAction<{ user: User; storeId: string } | null>>,
	setAssigningTimetable: Dispatch<SetStateAction<User | null>>,
) {
	return (
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
			<DropdownMenuContent align="end" className="w-[180px]">
				{menuType === "admin" ? (
					<DropdownMenuItem onClick={() => setConfirmAction({ user, action: "removeAdmin" })}>
						<UserX className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
						<span>Remove Admin</span>
					</DropdownMenuItem>
				) : menuType === "fix" ? (
					<>
						<DropdownMenuItem onClick={() => setAssigningStore({ user, storeId: "" })}>
							<Store className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
							<span>Assign Store</span>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setAssigningTimetable(user)}>
							<Clock3 className="mr-2 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
							<span>Assign Time Table</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => setConfirmAction({ user, action: "makeAdmin" })}>
							<Crown className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
							<span>Make Admin</span>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setConfirmAction({ user, action: "removeFix" })}>
							<UserX className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
							<span>Remove Employee Role</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => setConfirmAction({ user, action: "reject" })}>
							<XCircle className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
							<span>Revoke Access</span>
						</DropdownMenuItem>
					</>
				) : (
					<>
						{/* <DropdownMenuItem onClick={() => setConfirmAction({ user, action: "makeAdmin" })}>
							<ShieldCheck className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
							<span>Make Admin</span>
						</DropdownMenuItem> */}
						<DropdownMenuItem onClick={() => setConfirmAction({ user, action: "makeFix" })}>
							<Shield className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
							<span>Make Fix</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => setConfirmAction({ user, action: "reject" })}>
							<UserX className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
							<span>Revoke Access</span>
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function makeUser(
	user: User,
	updatingUser: string | null,
	menuType: MenuAction,
	setConfirmAction: Dispatch<
		SetStateAction<{
			user: User;
			action: "accept" | "reject" | "makeAdmin" | "removeAdmin" | "makeFix" | "removeFix";
		} | null>
	>,
	setEditingUser: Dispatch<SetStateAction<{ user: User; nickname: string } | null>>,
	setAssigningStore: Dispatch<SetStateAction<{ user: User; storeId: string } | null>>,
	setAssigningTimetable: Dispatch<SetStateAction<User | null>>,
	stores: StoreType[],
) {
	const assignedStore =
		menuType === "fix" && user.store_id != null
			? stores.find((s) => s.id === user.store_id)
			: undefined;

	return (
		<div
			key={user.email}
			className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4"
		>
			<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
				<Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
					<AvatarImage src={user.image} alt={user.first_name} referrerPolicy="no-referrer" />
					<AvatarFallback className="text-xs sm:text-sm">
						{getInitials(user.first_name)}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<button
						type="button"
						onClick={() => setEditingUser({ user, nickname: user.nickname || user.first_name })}
						className="group flex items-center gap-1 text-left"
					>
						<p className="font-medium text-sm sm:text-base truncate transition-colors">
							{user.nickname || user.first_name}
						</p>
						<Pencil className="h-3 w-3 opacity-0 transition-all duration-150 group-hover:opacity-100" />
					</button>
					<p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
					{assignedStore && (
						<span className="inline-flex items-center gap-1 mt-0.5 text-xs font-medium text-green-700 dark:text-green-400">
							<Store className="h-3 w-3" />
							{assignedStore.name}
						</span>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				{getOptions(user, updatingUser, setConfirmAction, menuType, setAssigningStore, setAssigningTimetable)}
			</div>
		</div>
	);
}

export default function AllUsersPage() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [updatingUser, setUpdatingUser] = useState<string | null>(null);
	const [editingUser, setEditingUser] = useState<{ user: User; nickname: string } | null>(null);
	const [addingEmployee, setAddingEmployee] = useState(false);
	const [newEmployeeNames, setNewEmployeeNames] = useState<string[]>([""]);

	const handleNameChange = (i: number, value: string) => {
		setNewEmployeeNames((prev) => {
			const next = [...prev];
			next[i] = value;
			const firstEmpty = next.findIndex((n) => !n.trim());
			if (firstEmpty === -1) return [...next, ""];
			return next.slice(0, firstEmpty + 1);
		});
	};

	const [confirmAction, setConfirmAction] = useState<{
		user: User;
		action: "accept" | "reject" | "makeAdmin" | "removeAdmin" | "makeFix" | "removeFix";
	} | null>(null);

	const [assigningStore, setAssigningStore] = useState<{ user: User; storeId: string } | null>(
		null,
	);
	const [stores, setStores] = useState<StoreType[]>([]);

	const [assigningTimetable, setAssigningTimetable] = useState<User | null>(null);
	const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
	const [timetableContractHours, setTimetableContractHours] = useState<string>("");
	const [timetableLoading, setTimetableLoading] = useState(false);

	const fetchUsers = async () => {
		const userData = await getAllUsers();
		setUsers(userData.sort((a, b) => a.first_name.localeCompare(b.first_name)));
		setLoading(false);
	};

	useEffect(() => {
		fetchUsers();
		getStoresForApp().then(setStores);
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

	const handleSaveNickname = async () => {
		if (!editingUser) return;
		const { user, nickname } = editingUser;
		setEditingUser(null);
		setUpdatingUser(user.email);
		try {
			const result = await changeNickname(user.email, nickname.trim());
			if (result) {
				toast.success("Username updated successfully");
				await fetchUsers();
			} else {
				toast.error("Failed to update username");
			}
		} catch (error) {
			console.error("Error updating nickname:", error);
			toast.error("Failed to update username");
		} finally {
			setUpdatingUser(null);
		}
	};

	const handleCreateEmployee = async () => {
		const names = newEmployeeNames.map((n) => n.trim()).filter(Boolean);
		if (!names.length) return;
		setAddingEmployee(false);
		setNewEmployeeNames([""]);
		setUpdatingUser("__creating__");
		try {
			const results = await Promise.all(names.map((name) => createEmployee(name)));
			const succeeded = results.filter(Boolean).length;
			if (succeeded === names.length) {
				toast.success(
					names.length === 1 ? `Employee "${names[0]}" added` : `${names.length} employees added`,
				);
			} else {
				toast.error("Some employees could not be added");
			}
			await fetchUsers();
		} catch (error) {
			console.error("Error creating employees:", error);
			toast.error("Failed to add employees");
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

	useEffect(() => {
		if (!assigningTimetable) return;
		setTimetableLoading(true);
		getTimetable(assigningTimetable.email).then((rows) => {
			setTimetableEntries(
				rows.map((r) => ({
					day_of_week: r.day_of_week,
					start_time: r.start_time,
					end_time: r.end_time,
					store_id: r.store_id ?? null,
				})),
			);
			setTimetableContractHours(
				assigningTimetable.contract_hours != null
					? String(assigningTimetable.contract_hours)
					: "",
			);
			setTimetableLoading(false);
		});
	}, [assigningTimetable]);

	const handleSaveTimetable = async () => {
		if (!assigningTimetable) return;
		const contractHours = timetableContractHours ? Number(timetableContractHours) : null;
		setAssigningTimetable(null);
		setUpdatingUser(assigningTimetable.email);
		try {
			const ok = await saveTimetable(
				assigningTimetable.email,
				contractHours,
				timetableEntries.map((e) => ({
					day_of_week: e.day_of_week,
					start_time: e.start_time,
					end_time: e.end_time,
					store_id: e.store_id ?? null,
				})),
			);
			if (ok) {
				toast.success("Timetable saved");
				await fetchUsers();
			} else {
				toast.error("Failed to save timetable");
			}
		} catch {
			toast.error("Failed to save timetable");
		} finally {
			setUpdatingUser(null);
		}
	};

	const handleAssignStore = async () => {
		if (!assigningStore) return;
		const { user, storeId } = assigningStore;
		setAssigningStore(null);
		setUpdatingUser(user.email);
		try {
			const result = await assignUserStore(user.email, storeId ? Number(storeId) : null);
			if (result) {
				toast.success(`Store assigned to ${user.nickname || user.first_name}`);
				await fetchUsers();
			} else {
				toast.error("Failed to assign store");
			}
		} catch (error) {
			console.error("Error assigning store:", error);
			toast.error("Failed to assign store");
		} finally {
			setUpdatingUser(null);
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
				<Card className="min-w-[200px] shrink-0 flex-1">
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
				<Card className="min-w-[200px] shrink-0 flex-1">
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
				<Card className="min-w-[200px] shrink-0 flex-1">
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
				<Card className="min-w-[200px] shrink-0 flex-1">
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
				<Card className="min-w-[200px] shrink-0 flex-1">
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
									<Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
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
								<div className="flex items-center gap-2 shrink-0">
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
							adminUsers.map((user) =>
								makeUser(
									user,
									updatingUser,
									"admin",
									setConfirmAction,
									setEditingUser,
									setAssigningStore,
									setAssigningTimetable,
									stores,
								),
							)
						)}
					</CardContent>
				</Card>

				{/* Fix Users */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
								Employees ({fixUsers.length})
							</CardTitle>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0"
								onClick={() => setAddingEmployee(true)}
							>
								<UserPlus className="h-4 w-4" />
								<span className="sr-only">Add employee</span>
							</Button>
						</div>
						<CardDescription>Employees with schedule fix privileges</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{fixUsers.length === 0 ? (
							<p className="text-sm text-muted-foreground">No fixers found</p>
						) : (
							fixUsers.map((user) =>
								makeUser(
									user,
									updatingUser,
									"fix",
									setConfirmAction,
									setEditingUser,
									setAssigningStore,
									setAssigningTimetable,
									stores,
								),
							)
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
							regularUsers.map((user) =>
								makeUser(
									user,
									updatingUser,
									"student",
									setConfirmAction,
									setEditingUser,
									setAssigningStore,
									setAssigningTimetable,
									stores,
								),
							)
						)}
					</CardContent>
				</Card>
			</div>

			{/* Add Employee Dialog */}
			<Dialog
				open={addingEmployee}
				onOpenChange={(open) => {
					setAddingEmployee(open);
					if (!open) setNewEmployeeNames([""]);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Employees</DialogTitle>
						<DialogDescription>
							Create dummy employee accounts for planning purposes.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-2">
						{newEmployeeNames.map((name, i) => (
							<Input
								key={i}
								value={name}
								onChange={(e) => handleNameChange(i, e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleCreateEmployee()}
								placeholder="Employee name"
								autoFocus={i === 0}
								className="animate-in fade-in-0 slide-in-from-top-2 duration-200"
							/>
						))}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAddingEmployee(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreateEmployee}
							disabled={!newEmployeeNames.some((n) => n.trim())}
						>
							Add
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Username Dialog */}
			<Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Username</DialogTitle>
						<DialogDescription>
							Set a display name for <strong>{editingUser?.user.first_name}</strong>.
						</DialogDescription>
					</DialogHeader>
					<Input
						value={editingUser?.nickname ?? ""}
						onChange={(e) =>
							setEditingUser((prev) => prev && { ...prev, nickname: e.target.value })
						}
						onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()}
						placeholder="Enter username"
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingUser(null)}>
							Cancel
						</Button>
						<Button onClick={handleSaveNickname} disabled={!editingUser?.nickname.trim()}>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

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

			{/* Assign Store Dialog */}
			<Dialog open={!!assigningStore} onOpenChange={() => setAssigningStore(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Assign Store</DialogTitle>
						<DialogDescription>
							Select the store for{" "}
							<strong>{assigningStore?.user.nickname || assigningStore?.user.first_name}</strong>.
						</DialogDescription>
					</DialogHeader>
					<Select
						value={assigningStore?.storeId ?? ""}
						onValueChange={(value) =>
							setAssigningStore((prev) => prev && { ...prev, storeId: value })
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select a store" />
						</SelectTrigger>
						<SelectContent>
							{stores.map((store) => (
								<SelectItem key={store.id} value={String(store.id)}>
									{store.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAssigningStore(null)}>
							Cancel
						</Button>
						<Button
							onClick={handleAssignStore}
							disabled={!assigningStore?.storeId || !!updatingUser}
						>
							{updatingUser ? "Processing..." : "Assign"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Timetable Dialog */}
			<Dialog
				open={!!assigningTimetable}
				onOpenChange={(open) => {
					if (!open) setAssigningTimetable(null);
				}}
			>
				<DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
					<DialogHeader>
						<DialogTitle>Assign Time Table</DialogTitle>
						<DialogDescription>
							Set the weekly schedule for{" "}
							<strong>
								{assigningTimetable?.nickname || assigningTimetable?.first_name}
							</strong>
							.
						</DialogDescription>
					</DialogHeader>

					<div className="overflow-y-auto flex-1 space-y-4 pr-1">
						{timetableLoading ? (
							<div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
								<RefreshCw className="h-6 w-6 animate-spin text-primary" />
								<p className="text-sm">Loading timetable…</p>
							</div>
						) : (
							<>
								{/* Contract hours */}
								<div className="space-y-1.5">
									<Label className="text-sm font-medium">Contract hours / week</Label>
									<Input
										type="number"
										min={0}
										max={60}
										step={0.5}
										placeholder="e.g. 38"
										value={timetableContractHours}
										onChange={(e) => setTimetableContractHours(e.target.value)}
									/>
								</div>

								{/* Day rows */}
								<div className="space-y-2">
									<Label className="text-sm font-medium">Working days</Label>
							{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
								(dayName, idx) => {
									const entry = timetableEntries.find((e) => e.day_of_week === idx);
									const checked = !!entry;
									const hoursUndecided = checked && !entry.start_time && !entry.end_time;
									return (
										<div key={idx} className="rounded-lg border p-3 space-y-2">
											<div className="flex items-center gap-2">
												<Checkbox
													id={`day-${idx}`}
													checked={checked}
													onCheckedChange={(val) => {
														if (val) {
															setTimetableEntries((prev) => [
																...prev,
																{
																	day_of_week: idx,
																	start_time: "09:00",
																	end_time: "17:00",
																	store_id: assigningTimetable?.store_id ?? null,
																},
															]);
														} else {
															setTimetableEntries((prev) =>
																prev.filter((e) => e.day_of_week !== idx),
															);
														}
													}}
												/>
												<label
													htmlFor={`day-${idx}`}
													className="text-sm font-medium cursor-pointer"
												>
													{dayName}
												</label>
											</div>
											{checked && entry && (
												<div className="grid grid-cols-2 gap-2 pl-6">
													<div className="col-span-2 flex items-center gap-2">
														<Checkbox
															id={`day-${idx}-hours-undecided`}
															checked={hoursUndecided}
															onCheckedChange={(val) =>
																setTimetableEntries((prev) =>
																	prev.map((en) =>
																		en.day_of_week === idx
																			? {
																					...en,
																					start_time: val ? "" : "09:00",
																					end_time: val ? "" : "17:00",
																				}
																			: en,
																	),
																)
															}
														/>
														<label
															htmlFor={`day-${idx}-hours-undecided`}
															className="text-xs text-muted-foreground cursor-pointer"
														>
															Hours not decided yet
														</label>
													</div>
													{hoursUndecided ? (
														<p className="col-span-2 text-xs text-muted-foreground">
															Marked as a working day — hours can be set later.
														</p>
													) : (
														<>
															<div className="space-y-1">
																<Label className="text-xs text-muted-foreground">Start</Label>
																<Input
																	type="time"
																	value={entry.start_time}
																	onChange={(e) =>
																		setTimetableEntries((prev) =>
																			prev.map((en) =>
																				en.day_of_week === idx
																					? { ...en, start_time: e.target.value }
																					: en,
																			),
																		)
																	}
																/>
															</div>
															<div className="space-y-1">
																<Label className="text-xs text-muted-foreground">End</Label>
																<Input
																	type="time"
																	value={entry.end_time}
																	onChange={(e) =>
																		setTimetableEntries((prev) =>
																			prev.map((en) =>
																				en.day_of_week === idx
																					? { ...en, end_time: e.target.value }
																					: en,
																			),
																		)
																	}
																/>
															</div>
														</>
													)}
													<div className="col-span-2 space-y-1">
														<Label className="text-xs text-muted-foreground">
															Store override (optional)
														</Label>
														<Select
															value={entry.store_id != null ? String(entry.store_id) : "__default__"}
															onValueChange={(val) =>
																setTimetableEntries((prev) =>
																	prev.map((en) =>
																		en.day_of_week === idx
																			? {
																					...en,
																					store_id:
																						val === "__default__" ? null : Number(val),
																				}
																			: en,
																	),
																)
															}
														>
															<SelectTrigger>
																<SelectValue placeholder="Default store" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="__default__">Default store</SelectItem>
																{stores.map((s) => (
																	<SelectItem key={s.id} value={String(s.id)}>
																		{s.name}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</div>
												</div>
											)}
										</div>
									);
								},
							)}
						</div>
							</>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setAssigningTimetable(null)}>
							Cancel
						</Button>
						<Button onClick={handleSaveTimetable} disabled={!!updatingUser || timetableLoading}>
							{updatingUser ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

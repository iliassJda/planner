"use client";

import { User } from "@/types";
import { UserContext } from "@/context/user-context";

export default function UserProvider({
	user,
	children,
}: {
	user: User;
	children: React.ReactNode;
}) {
	return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

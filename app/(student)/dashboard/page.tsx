"use client";
import { useUser } from "@/context/user-context";

// { user }: { user: User }
// export default function Availability({ user }: { user: User }) {
export default function Availability() {
	const user = useUser();
	// console.log(user, "is the user!");
	return <div>Welcome {user?.name}!</div>;
}

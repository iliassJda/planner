"use client";

import { useSession } from "next-auth/react";
// import { auth } from "@/auth";
// import getServer
import Image from "next/image";

export default function Dashboard() {
	const { data: session, status } = useSession();
	// const session = await auth();

	if (status === "loading") return <p>Loading...</p>;
	if (!session) return <p>You must sign in first.</p>;
	// console.log(session);
	return (
		<div>
			<h1>Welcome, {session.user?.name}!</h1>
			<p>Email: {session.user?.email}</p>
			<Image
				width={96}
				height={96}
				src={session.user?.image ?? ""}
				alt="Profile picture"
				className="rounded-full w-16 h-16"
			/>
		</div>
	);
}

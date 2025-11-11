"use server";
import { signIn } from "@/auth";

async function login() {
	await signIn("google", { redirectTo: "/test" });
}

export { login };

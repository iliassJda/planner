"use server";
import { signIn, signOut } from "@/auth";

async function login() {
	await signIn("google", { redirectTo: "/dashboard" });
}

async function logout() {
	await signOut({ redirectTo: "/dashboard" });
}

export { login, logout };

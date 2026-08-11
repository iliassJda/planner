import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/provider/theme-provider";
import { Toaster } from "sonner";
import SupportShortcut from "@/components/support-shortcut";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Student Planner",
	description: "Student planner for Neuhaus",
	manifest: "/manifest.webmanifest",
	appleWebApp: {
		capable: true,
		title: "Neuhaus Planner",
		statusBarStyle: "black-translucent",
	},
	icons: {
		icon: [
			{ url: "/icon-192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icon-512.png", sizes: "512x512", type: "image/png" },
		],
		apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				{/* {children} */}
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					// disableTransitionOnChange
				>
					{/* {children} */}
					<SessionProvider>{children}</SessionProvider>
					<SupportShortcut />
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}

// app/page.tsx — Neuhaus Planner landing (direction 1c "Cacao", dark & premium)
// Drop-in replacement for your existing app/page.tsx.
// The landing is intentionally always dark/luxe, so the theme toggle is omitted here.

import Link from "next/link";
import Image from "next/image";
import { Cormorant_Garamond } from "next/font/google";
import { Share, Plus } from "lucide-react";
import { login } from "@/action/authentication";

const cormorant = Cormorant_Garamond({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	style: ["normal", "italic"],
	variable: "--font-cormorant",
});

const RADIAL = "radial-gradient(120% 90% at 50% -10%, #34241a 0%, #241811 55%, #1d130d 100%)";

export default function Home() {
	return (
		<div
			className={`${cormorant.variable} min-h-svh w-full text-[#f6ede0]`}
			style={{ background: RADIAL }}
		>
			{/* Sticky header */}
			<header className="sticky top-0 z-50 border-b border-[#d2aa78]/15 bg-[#1d130d]/30 backdrop-blur-md">
				<div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 md:px-10">
					<div className="flex items-center gap-3">
						<Image src="/neuhausSmall.png" alt="Neuhaus" width={34} height={34} />
						<div className="flex flex-col leading-none">
							<span className="font-serif text-xl font-semibold text-[#f2e7d8]">
								Neuhaus Planner
							</span>
							<span className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-[#b79574]">
								Staff Scheduling
							</span>
						</div>
					</div>
					<nav className="flex items-center gap-6 text-sm">
						<a href="#how" className="hidden text-[#c3a888] hover:text-[#f2e7d8] sm:inline">
							How it works
						</a>
						<a href="#install" className="hidden text-[#c3a888] hover:text-[#f2e7d8] sm:inline">
							Install
						</a>
						{/* <Link
							href="/login"
							className="rounded-full border border-[#d2aa78]/30 px-4 py-2 text-sm font-medium text-[#f2e7d8] hover:border-[#d2aa78]/60"
						>
							Sign in
						</Link> */}
					</nav>
				</div>
			</header>

			<div className="mx-auto w-full max-w-5xl px-6 md:px-10">
				{/* Hero */}
				<section className="flex flex-col items-center px-2 py-24 text-center md:py-28">
					<span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.26em] text-[#e0b878]">
						<span className="h-1.5 w-1.5 rounded-full bg-[#e0b878]" />
						Student Portal
					</span>
					<h1 className="font-serif mt-6 max-w-3xl text-5xl font-medium leading-[1.04] tracking-tight text-[#f6ede0] md:text-7xl">
						Your week, planned around <span className="italic text-[#e0b878]">your</span>{" "}
						availability.
					</h1>
					<p className="mt-6 max-w-xl text-lg leading-relaxed text-[#c3ac93]">
						Tell us the shifts you can work each week. We&apos;ll build the schedule and deliver
						your hours to your inbox.
					</p>
					<div className="mt-10 flex flex-col items-center gap-3.5">
						<form action={login}>
							<button
								type="submit"
								className="inline-flex items-center gap-3 rounded-full bg-[#f6ede0] px-7 py-4 text-[15px] font-medium text-[#241811] shadow-[0_18px_40px_-18px_rgba(224,184,120,0.5)] transition-transform hover:-translate-y-0.5"
							>
								<GoogleIcon />
								Continue with Google
							</button>
						</form>
						<span className="text-[12.5px] text-[#9a8267]">
							Neuhaus staff only · use your work Google account
						</span>
					</div>
				</section>

				{/* How it works */}
				<section id="how" className="scroll-mt-8 border-t border-[#d2aa78]/15 py-16">
					<div className="mb-12 text-center">
						<span className="text-xs uppercase tracking-[0.24em] text-[#b79574]">How it works</span>
						<h2 className="font-serif mt-2.5 text-3xl font-medium text-[#f6ede0]">
							Three steps to your schedule
						</h2>
					</div>
					<div className="grid gap-8 sm:grid-cols-3">
						<Step
							n="01"
							title="Sign in with Google"
							desc="One tap with your Google work account. New team members are approved by a manager."
						/>
						<Step
							n="02"
							title="Mark your availability"
							desc="For each open week, pick morning, afternoon, or whole day — and set your target hours."
						/>
						<Step
							n="03"
							title="Get your shifts"
							desc="Once the planner is published, your store, dates and times land in your inbox."
						/>
					</div>
				</section>

			</div>

			{/* Add to Home Screen (iOS) — full-width background */}
			<section
				id="install"
				className="scroll-mt-30 border-t border-[#d2aa78]/15 py-16"
				style={{
					background: "linear-gradient(180deg, rgba(224,184,120,0.05), rgba(224,184,120,0))",
				}}
			>
				<div className="mx-auto w-full max-w-5xl px-6 md:px-10">
					<div className="flex flex-wrap items-start justify-between gap-10">
						<div className="max-w-sm">
							<span className="inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.24em] text-[#b79574]">
								<IphoneIcon />
								Install on iPhone
							</span>
							<h2 className="font-serif mt-3 mb-3 text-3xl font-medium leading-tight text-[#f6ede0]">
								Add it to your Home&nbsp;Screen
							</h2>
							<p className="text-sm leading-relaxed text-[#b6a08a]">
								Keep the planner one tap away. Open this page in{" "}
								<span className="text-[#e0b878]">Safari</span> on your iPhone and follow the three
								steps.
							</p>
						</div>
						<div className="grid min-w-[320px] flex-1 gap-6 sm:grid-cols-3">
							<InstallStep
								n="01"
								title="Tap Share"
								desc="In Safari, tap the Share icon at the bottom of the screen."
							>
								<Share className="h-[17px] w-[17px] text-[#e0b878]" />
							</InstallStep>
							<InstallStep
								n="02"
								title="Add to Home Screen"
								desc={`Scroll the share sheet and choose “Add to Home Screen”.`}
							>
								<Plus className="h-[17px] w-[17px] text-[#e0b878]" />
							</InstallStep>
							<InstallStep
								n="03"
								title="Tap Add"
								desc="Confirm, and the Neuhaus icon lands on your Home Screen."
							>
								<Image src="/neuhausSmall.png" alt="" width={19} height={19} />
							</InstallStep>
						</div>
					</div>
				</div>
			</section>

			<div className="mx-auto w-full max-w-5xl px-6 md:px-10">
				{/* Footer */}
				<footer className="flex items-center justify-between border-t border-[#d2aa78]/15 py-6 text-xs text-[#9a8267]">
					<span>© Plannez - Iliass Jdaoudi</span>
					<span>Built for the Neuhaus student team</span>
				</footer>
			</div>
		</div>
	);
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
	return (
		<div>
			<div className="font-serif text-4xl leading-none text-[#e0b878]">{n}</div>
			<div className="my-4.5 h-px bg-[#d2aa78]/20" />
			<h3 className="mb-2 text-[17px] font-semibold text-[#f2e7d8]">{title}</h3>
			<p className="text-sm leading-relaxed text-[#b6a08a]">{desc}</p>
		</div>
	);
}

function InstallStep({
	n,
	title,
	desc,
	children,
}: {
	n: string;
	title: string;
	desc: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-xl border border-[#d2aa78]/15 bg-[#f6ede0]/[0.04] p-5.5">
			<div className="mb-4 flex items-center gap-3">
				<span className="font-serif text-[30px] leading-none text-[#e0b878]">{n}</span>
				<span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-[#d2aa78]/25 bg-[#e0b878]/10">
					{children}
				</span>
			</div>
			<h3 className="mb-1.5 text-[15.5px] font-semibold text-[#f2e7d8]">{title}</h3>
			<p className="text-[13.5px] leading-relaxed text-[#b6a08a]">{desc}</p>
		</div>
	);
}

function IphoneIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 24 24" fill="none">
			<rect x="5" y="3" width="14" height="18" rx="3" stroke="#e0b878" strokeWidth="1.6" />
			<rect x="10" y="17.5" width="4" height="1.6" rx="0.8" fill="#e0b878" />
		</svg>
	);
}

function GoogleIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24">
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
			/>
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
			/>
			<path
				fill="#FBBC05"
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
			/>
		</svg>
	);
}

//---------------------------------------------------------------------------------------------------------------
// import { Button } from "@/components/ui/button";
// import Link from "next/link";
// import { Calendar, Users, Clock, ArrowRight } from "lucide-react";
// import ToggleButton from "@/components/toggle-theme-button";

// export default function Home() {
// 	return (
// 		<div className="flex min-h-svh w-full flex-col">
// 			{/* Header with Theme Toggle */}
// 			<header className="flex justify-end px-6 py-4 md:px-10">
// 				<ToggleButton />
// 			</header>
// 			{/* Hero Section */}
// 			<section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center md:px-10">
// 				<div className="max-w-3xl space-y-6">
// 					<h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
// 						Welcome to{" "}
// 						<span className="bg-gradient-to-r from-primary to-primary/80 dark:to-primary/60 bg-clip-text text-transparent">
// 							Student Planner
// 						</span>
// 					</h1>
// 					<p className="mx-auto max-w-xl text-lg text-muted-foreground md:text-xl">
// 						Streamline your scheduling and planning. Organize your weeks, manage your team, and stay
// 						on top of everything.
// 					</p>
// 					<div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-center">
// 						<Link href="/dashboard">
// 							<Button size="lg" className="w-full sm:w-auto">
// 								Go to Dashboard
// 								<ArrowRight className="ml-2 h-4 w-4" />
// 							</Button>
// 						</Link>
// 						<Link href="/login">
// 							<Button variant="outline" size="lg" className="w-full sm:w-auto">
// 								Sign In
// 							</Button>
// 						</Link>
// 					</div>
// 				</div>
// 			</section>

// 			{/* Features Section */}
// 			<section className="border-t bg-muted/50 px-6 py-16 md:px-10">
// 				<div className="mx-auto max-w-5xl">
// 					<h2 className="mb-12 text-center text-2xl font-semibold md:text-3xl">
// 						Everything you need to plan effectively
// 					</h2>
// 					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
// 						<FeatureCard
// 							icon={<Calendar className="h-8 w-8" />}
// 							title="Week Planning"
// 							description="Set up and manage weekly schedules with ease. Keep track of important dates and deadlines."
// 						/>
// 						<FeatureCard
// 							icon={<Users className="h-8 w-8" />}
// 							title="Team Management"
// 							description="Coordinate with your team members and assign tasks efficiently."
// 						/>
// 						<FeatureCard
// 							icon={<Clock className="h-8 w-8" />}
// 							title="Time Tracking"
// 							description="Monitor progress and ensure everything stays on schedule."
// 						/>
// 					</div>
// 				</div>
// 			</section>

// 			{/* Footer */}
// 			<footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground md:px-10">
// 				{/* <p>© 2026 Neuhaus Planner. All rights reserved.</p> */}
// 				<p>Designed and implemented by Iliass Jdaoudi</p>
// 			</footer>
// 		</div>
// 	);
// }

// function FeatureCard({
// 	icon,
// 	title,
// 	description,
// }: {
// 	icon: React.ReactNode;
// 	title: string;
// 	description: string;
// }) {
// 	return (
// 		<div className="flex flex-col items-center rounded-lg border bg-background p-6 text-center shadow-sm transition-shadow hover:shadow-md">
// 			<div className="mb-4 text-primary">{icon}</div>
// 			<h3 className="mb-2 text-lg font-semibold">{title}</h3>
// 			<p className="text-sm text-muted-foreground">{description}</p>
// 		</div>
// 	);
// }

//---------------------------------------------------------------------------------------------------------------

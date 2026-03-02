import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Users, Clock, ArrowRight } from "lucide-react";
import ToggleButton from "@/components/toggle-theme-button";

export default function Home() {
	return (
		<div className="flex min-h-svh w-full flex-col">
			{/* Header with Theme Toggle */}
			<header className="flex justify-end px-6 py-4 md:px-10">
				<ToggleButton />
			</header>
			{/* Hero Section */}
			<section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center md:px-10">
				<div className="max-w-3xl space-y-6">
					<h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
						Welcome to{" "}
						<span className="bg-gradient-to-r from-primary to-primary/80 dark:to-primary/60 bg-clip-text text-transparent">
							Student Planner
						</span>
					</h1>
					<p className="mx-auto max-w-xl text-lg text-muted-foreground md:text-xl">
						Streamline your scheduling and planning. Organize your weeks, manage your team, and stay
						on top of everything.
					</p>
					<div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-center">
						<Link href="/dashboard">
							<Button size="lg" className="w-full sm:w-auto">
								Go to Dashboard
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</Link>
						<Link href="/login">
							<Button variant="outline" size="lg" className="w-full sm:w-auto">
								Sign In
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="border-t bg-muted/50 px-6 py-16 md:px-10">
				<div className="mx-auto max-w-5xl">
					<h2 className="mb-12 text-center text-2xl font-semibold md:text-3xl">
						Everything you need to plan effectively
					</h2>
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						<FeatureCard
							icon={<Calendar className="h-8 w-8" />}
							title="Week Planning"
							description="Set up and manage weekly schedules with ease. Keep track of important dates and deadlines."
						/>
						<FeatureCard
							icon={<Users className="h-8 w-8" />}
							title="Team Management"
							description="Coordinate with your team members and assign tasks efficiently."
						/>
						<FeatureCard
							icon={<Clock className="h-8 w-8" />}
							title="Time Tracking"
							description="Monitor progress and ensure everything stays on schedule."
						/>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground md:px-10">
				{/* <p>© 2026 Neuhaus Planner. All rights reserved.</p> */}
				<p>Designed and implemented by Iliass Jdaoudi</p>
			</footer>
		</div>
	);
}

function FeatureCard({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<div className="flex flex-col items-center rounded-lg border bg-background p-6 text-center shadow-sm transition-shadow hover:shadow-md">
			<div className="mb-4 text-primary">{icon}</div>
			<h3 className="mb-2 text-lg font-semibold">{title}</h3>
			<p className="text-sm text-muted-foreground">{description}</p>
		</div>
	);
}

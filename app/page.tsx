import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
export default function Home() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="w-full max-w-sm">
				<div className="flex flex-col gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Go to /dashboard</CardTitle>
							<CardDescription>For now, this page has no content</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/dashboard">
								<Button>dashboard</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

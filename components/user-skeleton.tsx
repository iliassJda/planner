import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UserSkeleton() {
	return (
		<div className="flex flex-col gap-6 p-6">
			{/* Welcome Header Skeleton */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-4">
					<Skeleton className="h-16 w-16 rounded-full" />
					<div className="space-y-2">
						<Skeleton className="h-8 w-64 md:h-9" />
						<Skeleton className="h-5 w-48" />
					</div>
				</div>
				<div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
					<Skeleton className="h-5 w-5" />
					<Skeleton className="h-5 w-16" />
				</div>
			</div>

			{/* Quick Stats Skeleton */}
			<div className="grid gap-4 sm:grid-cols-3">
				{[...Array(3)].map((_, i) => (
					<Card key={i}>
						<CardContent className="flex items-center gap-4 pt-6">
							<Skeleton className="h-12 w-12 rounded-lg" />
							<div className="space-y-2">
								<Skeleton className="h-8 w-8" />
								<Skeleton className="h-4 w-24" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Availability Form Skeleton */}
			<div>
				<Skeleton className="h-6 w-48 mb-4" />
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{[...Array(3)].map((_, i) => (
						<Card key={i} className="overflow-hidden">
							<CardHeader className="bg-muted/50">
								<div className="flex items-center gap-2">
									<Skeleton className="h-5 w-5" />
									<Skeleton className="h-6 w-20" />
								</div>
								<Skeleton className="h-4 w-16" />
							</CardHeader>
							<CardContent className="pt-4">
								<Skeleton className="h-4 w-48 mb-6" />
								{/* Availability Summary Skeleton */}
								<div className="rounded-lg border bg-muted/30 p-4">
									<div className="flex items-center justify-between mb-3">
										<Skeleton className="h-5 w-32" />
										<Skeleton className="h-9 w-24" />
									</div>
									<div className="grid grid-cols-2 gap-2">
										<div className="flex items-center gap-2">
											<Skeleton className="h-4 w-4" />
											<Skeleton className="h-4 w-16" />
										</div>
										<div className="flex items-center gap-2">
											<Skeleton className="h-4 w-4" />
											<Skeleton className="h-4 w-20" />
										</div>
									</div>
								</div>
								<div className="mt-6 flex items-center justify-between">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-9 w-20" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>

			{/* Submitted Weeks Section Skeleton */}
			<div>
				<Skeleton className="h-6 w-48 mb-4" />
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{[...Array(2)].map((_, i) => (
						<Card
							key={i}
							className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10"
						>
							<CardContent className="flex items-center justify-between pt-6">
								<div className="flex items-center gap-3">
									<Skeleton className="h-9 w-9 rounded-full" />
									<div className="space-y-2">
										<Skeleton className="h-5 w-16" />
										<Skeleton className="h-4 w-24" />
									</div>
								</div>
								<Skeleton className="h-6 w-20 rounded-full" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</div>
	);
}

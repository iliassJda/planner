import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSkeleton() {
	return (
		<div className="flex flex-col gap-6 p-6">
			{/* Header Skeleton */}
			<div>
				<Skeleton className="h-9 w-64 mb-2" />
				<Skeleton className="h-5 w-80" />
			</div>

			{/* Stats Cards Skeleton */}
			<div className="grid gap-4 sm:grid-cols-3">
				{[...Array(3)].map((_, i) => (
					<Card key={i}>
						<CardContent className="flex items-center gap-4 pt-6">
							<Skeleton className="h-12 w-12 rounded-lg" />
							<div className="space-y-2">
								<Skeleton className="h-7 w-16" />
								<Skeleton className="h-4 w-24" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Week Selection Card Skeleton */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Skeleton className="h-5 w-5" />
						<Skeleton className="h-6 w-56" />
					</div>
					<Skeleton className="h-4 w-80 mt-2" />
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap items-center gap-3">
						<Skeleton className="h-9 w-28" />
						<Skeleton className="h-9 w-24" />
						<div className="flex-1" />
						<Skeleton className="h-9 w-32" />
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{[...Array(12)].map((_, i) => (
							<div key={i} className="flex items-center gap-3 rounded-lg border p-4">
								<Skeleton className="h-5 w-5 rounded" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-5 w-20" />
									<Skeleton className="h-4 w-32" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

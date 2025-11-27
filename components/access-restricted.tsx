import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { User } from "@/types";

export default function Restricted({ user }: { user: User }) {
	return (
		<div className="flex flex-1 items-center justify-center p-6">
			<Card className="w-full max-w-xl">
				<CardHeader>
					<CardTitle>User access restricted</CardTitle>
					<CardDescription>
						You do not currently have permission to access this area.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						If you believe this is a mistake, please contact your supervisor to request access.
						Provide them with your account email: <strong>{user.email}</strong>.
					</p>
				</CardContent>
				<CardFooter className="gap-2">
					{/* <Button asChild variant="default">
							<Link href={`mailto:admin@example.com?subject=Access request for ${user.email}`}>
								Contact supervisor
							</Link>
						</Button> */}
					<Button asChild variant="default">
						<Link href="/">Go back</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/action/authentication";
import { LoginButton } from "@/components/login-button";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Welcome back</CardTitle>
					<CardDescription>Sign in to access your account</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={login}>
						<LoginButton />
					</form>
					{/* <p className="mt-6 text-center text-sm text-muted-foreground">
						By signing in, you agree to our Terms of Service and Privacy Policy
					</p> */}
				</CardContent>
			</Card>
		</div>
	);
}

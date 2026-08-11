export default function SupportPage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen py-2">
			<h1 className="text-4xl font-bold mb-4">Support Page</h1>
			<p className="text-lg text-gray-600">
				If you have any questions or need assistance, please contact our support team.
			</p>
			<a
				href="mailto:support@neuhausplanner.com"
				className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
			>
				Contact Support
			</a>
		</div>
	);
}

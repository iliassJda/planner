// app/(admin)/admin/maker/maker-wrapper.tsx
"use client";
import { useState } from "react";
import DropArea from "./drop-area";
import CSVViewer from "./csv-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarPlus, UploadCloud, ChevronLeft } from "lucide-react";
import WeeklyPlanner from "./weekly-planner";

export default function MakerWrapper() {
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [fromScratch, setFromScratch] = useState<boolean>(false);

	const handleFromScratch = () => {
		setFromScratch(true);
	};

	// If user has chosen one of the paths, show the appropriate UI
	if (fromScratch || uploadedFile) {
		return (
			<div className="w-full h-full space-y-6 max-w-7xl mx-auto pb-10">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight md:text-3xl">Planner Maker</h1>
						<p className="text-muted-foreground mt-1 text-sm">
							{fromScratch ? "Building schedule from scratch" : "Editing imported schedule"}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						onClick={() => {
							setFromScratch(false);
							setUploadedFile(null);
						}}
					>
						<ChevronLeft className="h-4 w-4" />
						Back to Options
					</Button>
				</div>

				{fromScratch && (
					<div className="w-full">
						<WeeklyPlanner file={null} />
					</div>
				)}
				{uploadedFile && <CSVViewer file={uploadedFile} />}
			</div>
		);
	}

	// Show initial choice screen
	return (
		<div className="w-full max-w-5xl mx-auto h-full space-y-8 py-8">
			<div className="space-y-2">
				<h1 className="text-2xl font-bold tracking-tight md:text-4xl">Planner Maker</h1>
				<p className="text-muted-foreground text-lg">
					Choose how you want to create your weekly schedule.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
				{/* Start from Scratch Option */}
				<Card
					className="group relative overflow-hidden transition-all hover:shadow-md cursor-pointer border-2 hover:border-primary/50"
					onClick={handleFromScratch}
				>
					<CardHeader className="text-center pb-4 pt-10">
						<div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
							<CalendarPlus className="h-8 w-8 text-primary" />
						</div>
						<CardTitle className="text-2xl">Start from Scratch</CardTitle>
						<CardDescription className="text-base mt-2">
							Create a new weekly schedule from the beginning using employee availability
						</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center pb-10">
						<Button
							variant="default"
							className="mt-4"
							onClick={(e) => {
								e.stopPropagation();
								handleFromScratch();
							}}
						>
							Create New Schedule
						</Button>
					</CardContent>
				</Card>

				{/* Upload Existing File Option */}
				<Card className="border-2 border-dashed flex flex-col items-center justify-center p-0 transition-all hover:bg-secondary/20">
					<div className="w-full h-full min-h-[300px] flex items-center justify-center p-8">
						<DropArea onFileUpload={setUploadedFile} />
					</div>
				</Card>
			</div>
		</div>
	);
}

// app/(admin)/admin/maker/maker-wrapper.tsx
"use client";
import { useState } from "react";
import DropArea from "./drop-area";
import CSVViewer from "./csv-viewer";
import { Button } from "@/components/ui/button";
import { Divide } from "lucide-react";
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
			<div className="w-full h-full space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold md:text-3xl">Planner Maker</h1>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setFromScratch(false);
							setUploadedFile(null);
						}}
					>
						← Back
					</Button>
				</div>

				{fromScratch && (
					<div>
						<div className="pb-4">Create new schedule from scratch here</div>
						<WeeklyPlanner file={null} />
					</div>
				)}
				{uploadedFile && <CSVViewer file={uploadedFile} />}
			</div>
		);
	}

	// Show initial choice screen
	return (
		<div className="w-full h-full space-y-6">
			<h1 className="text-2xl font-bold md:text-3xl">Planner Maker</h1>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Start from Scratch Option */}
				<div
					className=" rounded-lg p-8 flex flex-col items-center justify-center space-y-4 hover:bg-secondary/50 transition-colors cursor-pointer"
					onClick={handleFromScratch}
				>
					{/* <div className="text-4xl">📝</div> */}
					<h2 className="text-xl font-semibold text-center">Start from Scratch</h2>
					<p className="text-sm text-muted-foreground text-center">
						Create a new weekly schedule from the beginning
					</p>
					<Button
						variant="default"
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							handleFromScratch();
						}}
					>
						Create New
					</Button>
				</div>

				{/* Upload Existing File Option */}
				<div className="rounded-lg p-8 flex flex-col items-center justify-center space-y-4 hover:bg-secondary/50 transition-colors">
					{/* <div className="text-4xl">📤</div> */}
					{/* <h2 className="text-xl font-semibold text-center">Upload Existing File</h2>
					<p className="text-sm text-muted-foreground text-center">
						Upload a partly completed schedule to continue editing
					</p> */}
					<DropArea onFileUpload={setUploadedFile} />
				</div>
			</div>
		</div>
	);
}

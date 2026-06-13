"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Upload, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DropAreaProps {
	onFileUpload?: (file: File) => void;
}

export default function DropArea({ onFileUpload }: DropAreaProps) {
	const [file, setFile] = useState<File | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			if (acceptedFiles) {
				setIsLoading(true);
				try {
					const selectedFile = acceptedFiles[0];
					setFile(selectedFile);
					onFileUpload?.(selectedFile);
					toast.success(selectedFile.name + " was uploaded successfully");
				} catch (error) {
					console.error("Error reading file:", error);
					toast.error("There was an error, please try again");
				} finally {
					setIsLoading(false);
				}
			}
		},
		[onFileUpload],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"text/csv": [".csv"],
		},
	});

	if (file) {
		return (
			<div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2 border-green-300 dark:border-green-700 rounded-xl p-8">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
						<div>
							<h3 className="font-semibold text-green-900 dark:text-green-100">File Uploaded</h3>
							<p className="text-sm text-green-700 dark:text-green-300">{file.name}</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setFile(null)}
						className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900"
					>
						<X className="w-5 h-5" />
					</Button>
				</div>
				{isLoading && (
					<p className="text-sm text-green-700 dark:text-green-300">Processing file...</p>
				)}
			</div>
		);
	}

	return (
		<div
			{...getRootProps()}
			className={`relative overflow-hidden rounded-xl p-16 text-center cursor-pointer transition-all duration-300 min-h-96 flex flex-col items-center justify-center ${
				isDragActive
					? " border-primary bg-primary/15 scale-105"
					: " border-dashed border-border bg-gradient-to-br from-secondary to-secondary/50 hover:border-primary hover:from-primary/5 hover:to-secondary/50"
			}`}
		>
			<input {...getInputProps()} />

			{/* <div className={`transition-all duration-300 ${isDragActive ? "scale-110" : "scale-100"}`}>
				<Upload
					className={`w-16 h-16 mx-auto mb-4 ${isDragActive ? "text-primary" : "text-muted-foreground"}`}
				/>
			</div> */}

			{isDragActive ? (
				<div>
					<p className="text-2xl font-bold text-primary">Drop your CSV file here</p>
					<p className="text-sm text-muted-foreground mt-2">Release to upload</p>
				</div>
			) : (
				<div>
					<p className="text-2xl font-bold text-foreground mb-2">Drag & drop your CSV file here</p>
					<p className="text-sm text-muted-foreground mb-6">or click to browse your computer</p>
					<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-background/50 px-4 py-2 rounded-lg w-fit mx-auto">
						<span>✓ CSV files only</span>
					</div>
				</div>
			)}
		</div>
	);
}

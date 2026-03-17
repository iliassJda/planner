"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { fileToText } from "@/action/file";

export default function DropArea() {
	const [file, setFile] = useState<File | null>(null);
	const [text, setText] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const onDrop = useCallback(async (acceptedFiles: File[]) => {
		if (acceptedFiles) {
			const selectedFile = acceptedFiles[0];
			setFile(selectedFile);
			setIsLoading(true);
			try {
				const fileText = await fileToText(selectedFile);
				setText(fileText);
			} catch (error) {
				console.error("Error reading file:", error);
			} finally {
				setIsLoading(false);
			}
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"text/csv": [".csv"],
		},
	});

	return file ? (
		<div className="space-y-4">
			<div className="bg-green-50 border border-green-200 rounded-lg p-4">
				<h2 className="font-semibold text-green-900 mb-2">✓ File uploaded: {file.name}</h2>
				{isLoading ? (
					<p className="text-sm text-muted-foreground">Loading file contents...</p>
				) : text ? (
					<div className="bg-white rounded border border-green-200 p-3 max-h-96 overflow-y-auto">
						<pre className="text-xs whitespace-pre-wrap break-words font-mono text-gray-700">
							{text}
						</pre>
					</div>
				) : (
					<p className="text-sm text-red-600">Error loading file contents</p>
				)}
			</div>
			<button
				onClick={() => {
					setFile(null);
					setText(null);
				}}
				className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
			>
				Upload Another File
			</button>
		</div>
	) : (
		<div
			{...getRootProps()}
			className={`border-4 border-dashed rounded-xl p-32 text-center cursor-pointer transition-colors min-h-screen flex flex-col items-center justify-center ${
				isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
			}`}
		>
			<input {...getInputProps()} />
			{isDragActive ? (
				<p className="text-4xl font-bold text-blue-600">Drop the files here 👇</p>
			) : (
				<p className="text-3xl font-semibold text-gray-600">
					Drag & drop CSV files here, or click to select
				</p>
			)}
		</div>
	);
}

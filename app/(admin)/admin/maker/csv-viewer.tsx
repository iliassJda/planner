"use client";

import { fileToText } from "@/action/file";
import { useEffect, useState } from "react";

interface CsvViewerProps {
	file: File;
}

export default function CsvViewer({ file }: CsvViewerProps) {
	const [rows, setRows] = useState<string[][]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const parseCSV = async () => {
			setLoading(true);
			try {
				const fileText = await fileToText(file);
				const lines = fileText.split("\n").filter((line) => line.trim());
				const parsedRows = lines.map((line) => line.split(",").map((cell) => cell.trim()));
				setRows(parsedRows);
				console.log("These are the rows: ", parsedRows);
			} catch (error) {
				console.error("Error parsing CSV:", error);
			} finally {
				setLoading(false);
			}
		};

		if (file) {
			parseCSV();
		}
	}, [file]);

	if (loading) return <div>Parsing CSV...</div>;
	if (!rows.length) return <div>No data to display</div>;

	return (
		<div className="overflow-x-auto">
			<h2 className="mb-4 text-xl font-semibold">Uploaded file</h2>
			<table className="w-full border-collapse border border-border">
				<tbody>
					{rows.map((row, idx) => (
						<tr key={idx} className="border border-border">
							{row.map((cell, cellIdx) => (
								<td key={cellIdx} className="border border-border px-4 py-2">
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

import Papa from "papaparse";
// import { resolve } from "path";

async function fileToText(file: File) {
	const text = await file.text();
	return text;
}

function parseCSV(file: File) {
	return new Promise((resolve) => {
		Papa.parse(file, {
			header: true, // turns rows into objects
			skipEmptyLines: true,
			complete: (results) => {
				resolve(results.data);
			},
		});
	});
}

export { fileToText, parseCSV };

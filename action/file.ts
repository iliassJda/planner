async function fileToText(file: File) {
	const text = await file.text();
	return text;
}

export { fileToText };

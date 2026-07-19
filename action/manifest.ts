import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Neuhaus Planner",
		short_name: "Neuhaus",
		description: "Submit your weekly availability and get your shifts.",
		start_url: "/dashboard",
		display: "standalone",
		background_color: "#241811",
		theme_color: "#241811",
		icons: [
			{ src: "/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icon-512.png", sizes: "512x512", type: "image/png" },
			{ src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
		],
	};
}

"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Store, Shift } from "@/types";

type GeneratedShift = {
	email: string;
	shift_date: string;
	store_id: number;
	start_time: string;
	end_time: string;
	hours: number;
};

const SYSTEM_PROMPT = `You are a staff scheduling assistant for Neuhaus chocolate shops in Brussels.

Your job is to generate a weekly shift schedule. You will receive:
- A list of stores with their IDs
- A list of fix (permanent) employees with their assigned store
- A list of student employees with their availability for each day and desired hours
- The 7 date keys (Mon–Sun) for the week
- An optional note from the manager with extra constraints

Rules:
1. Fix employees work at their assigned store every day (Mon–Sun), typically 09:00–17:00 (8h, including 30min break = 7.5h net). You can adjust if the manager's note says otherwise.
2. Students should ONLY be scheduled on days they are available (morning, afternoon, or whole_day). Never schedule a student on a day marked "not_available".
3. Respect each student's desired hours as closely as possible — don't go over.
4. Morning availability → schedule roughly 09:00–14:00. Afternoon → 14:00–19:00. Whole day → 09:00–17:00 or similar.
5. Each store should have adequate coverage — at least 1 person per day, ideally 2+ on busy days (Fri, Sat).
6. Shifts of 6h or more get a 30min break deducted from net hours.
7. Distribute students across stores fairly — avoid putting everyone in one store.
8. The manager's note takes priority over general rules when there's a conflict.

Return a JSON array of shift objects. Each object must have exactly these fields:
- email (string)
- shift_date (string, format "YYYY-MM-DD")
- store_id (number)
- start_time (string, format "HH:MM")
- end_time (string, format "HH:MM")
- hours (number — net hours after break deduction)

Return ONLY the JSON array, no markdown, no explanation.`;

export async function generatePlanning({
	stores,
	fixUsers,
	studentAvailabilities,
	weekDayKeys,
	managerNote,
}: {
	stores: Store[];
	fixUsers: { email: string; name: string; store_id: number | null }[];
	studentAvailabilities: {
		email: string;
		name: string;
		days: Record<string, string>;
		desiredHours: number;
	}[];
	weekDayKeys: string[];
	managerNote: string;
}): Promise<{ shifts: Shift[]; error?: string }> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		return { shifts: [], error: "GEMINI_API_KEY is not configured. Add it to .env.local" };
	}

	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

	const userMessage = `
STORES:
${stores.map((s) => `- ${s.name} (id: ${s.id})`).join("\n")}

FIX EMPLOYEES (permanent staff):
${fixUsers.map((u) => `- ${u.name} (${u.email}) — assigned store_id: ${u.store_id ?? "none"}`).join("\n")}

STUDENTS WITH AVAILABILITY:
${studentAvailabilities
	.map((s) => {
		const daysList = Object.entries(s.days)
			.map(([date, avail]) => `  ${date}: ${avail}`)
			.join("\n");
		return `- ${s.name} (${s.email}), wants ${s.desiredHours}h:\n${daysList}`;
	})
	.join("\n")}

WEEK DATES (Mon→Sun): ${weekDayKeys.join(", ")}

${managerNote ? `MANAGER NOTE:\n${managerNote}` : "No additional notes from manager."}

Generate the schedule now.`;

	try {
		const result = await model.generateContent({
			systemInstruction: SYSTEM_PROMPT,
			contents: [{ role: "user", parts: [{ text: userMessage }] }],
		});

		const text = result.response.text();

		const jsonMatch = text.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			return { shifts: [], error: "Could not parse response from AI" };
		}

		const generated: GeneratedShift[] = JSON.parse(jsonMatch[0]);

		const validStoreIds = new Set(stores.map((s) => s.id));
		const shifts: Shift[] = generated
			.filter((g) => validStoreIds.has(g.store_id))
			.map((g, i) => ({
				id: -(i + 1),
				email: g.email,
				shift_date: g.shift_date,
				store_id: g.store_id,
				start_time: g.start_time,
				end_time: g.end_time,
				hours: g.hours,
				custom_store_name: null,
				absence_type: null,
			}));

		return { shifts };
	} catch (e) {
		const message = e instanceof Error ? e.message : "Unknown error";
		return { shifts: [], error: message };
	}
}

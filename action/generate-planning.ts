"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Store, Shift } from "@/types";

type TimetableEntry = {
  day_of_week: number; // 0 = Mon, 6 = Sun
  start_time: string;
  end_time: string;
  store_id: number | null; // null = use the employee's default store
};

type FixUser = {
  email: string;
  name: string;
  store_id: number | null;
  contract_hours: number | null;
  timetable: TimetableEntry[];
};

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
- A list of fix (permanent) employees, each with a personal timetable (days, times, store)
- A list of student employees with their availability for each day and desired hours
- The 7 date keys (Mon–Sun) for the week
- An optional note from the manager with extra constraints

Rules:
1. Fix employees must follow their personal timetable exactly:
   - Only schedule them on the days listed in their timetable.
   - Use the start/end times from their timetable entry for that day.
   - If a timetable entry has a store_id, use that store for that day; otherwise use their default store.
   - If a fix employee has no timetable, schedule them every day (Mon–Sun) at their default store, 09:00–17:00.
   - If a timetable entry has no start/end time (hours not decided yet), still schedule them that day — use your judgement for a sensible shift (default to 09:00–17:00 if unsure).
2. Students should ONLY be scheduled on days they are available (morning, afternoon, or whole_day). Never schedule a student on a day marked "not_available".
3. Respect each student's desired hours as closely as possible — don't go over.
4. Morning availability → schedule roughly 10:00–16:00. Afternoon → 16:00–21:00. Whole day → 12:00–20:00 or similar.
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

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatFixUser(u: FixUser, weekDayKeys: string[]): string {
  const contractStr = u.contract_hours != null ? ` — contract: ${u.contract_hours}h/week` : "";
  const header = `- ${u.name} (${u.email}), default store_id: ${u.store_id ?? "none"}${contractStr}`;

  if (u.timetable.length === 0) {
    return `${header}\n  No timetable set — schedule every day at default store, 09:00–17:00`;
  }

  const entries = u.timetable
    .map((t) => {
      const date = weekDayKeys[t.day_of_week];
      const day = DAY_NAMES[t.day_of_week];
      const storeStr = t.store_id != null ? `store_id ${t.store_id}` : "default store";
      const timeStr =
        t.start_time && t.end_time
          ? `${t.start_time}–${t.end_time}`
          : "hours not decided yet — use your judgement (e.g. 09:00–17:00)";
      return `  ${date} (${day}): ${timeStr} at ${storeStr}`;
    })
    .join("\n");

  return `${header}\n${entries}`;
}

export async function generatePlanning({
  stores,
  fixUsers,
  studentAvailabilities,
  weekDayKeys,
  managerNote,
}: {
  stores: Store[];
  fixUsers: FixUser[];
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

FIX EMPLOYEES (permanent staff — follow timetable exactly):
${fixUsers.map((u) => formatFixUser(u, weekDayKeys)).join("\n")}

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

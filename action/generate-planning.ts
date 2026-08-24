"use server";

import { GoogleGenAI } from "@google/genai";
import type { Store, Shift } from "@/types";
import { isOtherStore, netShiftHours } from "@/help_functions";
import { logAiGeneration } from "@/action/supabase";

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

type StudentAvailability = {
  email: string;
  name: string;
  days: Record<string, string>;
  desiredHours: number;
};

type GeneratedShift = {
  email: string;
  shift_date: string;
  store_id: number;
  start_time: string;
  end_time: string;
  hours: number;
};

/**
 * Mean number of people on shift per day, measured across 87 weeks of the
 * manager's own plannings (2025–2026).
 *
 * Approximate: roughly 22% of historical shifts had their store inferred from
 * weekly hour totals rather than read directly from the cell, so these carry more
 * uncertainty than the shift windows and weekday figures below, which involve no
 * inference. Update here if the manager corrects them.
 */
const STORE_COVERAGE: Record<string, number> = {
  "Galerie de la Reine": 7.2,
  "Rue au Beurre": 3.1,
  "Grand-Place": 3.1,
  Madeleine: 2.0,
  Atelier: 1.4,
};
const DEFAULT_COVERAGE = 2;

const MODEL = "gemini-2.5-flash";

/**
 * Ceiling on the model's internal reasoning tokens. 0 disables thinking; null
 * leaves the model to decide.
 *
 * Benchmarked on real week-26 data, 5 samples per setting. Letting the model
 * decide burned 32,569 thinking tokens against 7,161 of actual output — 82% of
 * the work was deliberation — and took 270s, leaving barely any margin under the
 * 300s maxDuration on this route. Disabling it runs in ~30s with *better*
 * adherence: it hit Alexandra's 19h contract in 4 of 5 runs versus 1 of 5 at a
 * 512 budget, and produced fewer shifts the validator had to discard.
 *
 * That holds because the reasoning is already done for it — the prompt supplies
 * measured shift windows, per-store headcount, the weekday demand curve and each
 * fix employee's remaining contract hours. Re-measure if the prompt ever goes
 * back to being open-ended.
 *
 * Note the guard below tests `!= null`, not truthiness: 0 is falsy, and a
 * truthiness check would silently send no thinkingConfig at all.
 */
const THINKING_BUDGET: number | null = 0;

/** Shifts starting at or after this count as afternoon. */
const AFTERNOON_CUTOFF_MIN = 14 * 60;

const SYSTEM_PROMPT = `You are a staff scheduling assistant for Neuhaus chocolate shops in Brussels.

Your job is to generate a weekly shift schedule. You will receive:
- A list of stores with their IDs and typical daily headcount
- A list of fix (permanent) employees, each with a personal timetable (days, times, store)
- A list of student employees with their availability for each day and desired hours
- The 7 date keys (Mon–Sun) for the week
- An optional note from the manager with extra constraints

The times and staffing levels in these rules are measured from two years of this
manager's own plannings (87 weeks, ~10,400 shifts). Prefer them over generic
assumptions about retail hours.

Rules:
1. Fix employees must follow their personal timetable:
   - Only schedule them on the days listed in their timetable.
   - Days marked FIXED have settled hours — use those start/end times exactly.
   - Days marked FLEXIBLE are days the employee works, but whose hours are not
     settled. Size those shifts so the employee's week totals exactly their
     contract hours, after subtracting what the FIXED days already account for.
     The per-employee line states the remaining hours. Shifts on flexible days may
     be different lengths, and you need not use every flexible day — reaching the
     contract total matters more than filling every day.
   - Never exceed a fix employee's contract hours, and do not leave them short.
   - If a timetable entry has a store_id, use that store for that day; otherwise use their default store.
2. If a fix employee has NO timetable, do not invent a full week for them. Each such
   employee is annotated with a target number of days — schedule exactly that many
   days at their default store, spread sensibly across the week, using the fix
   windows in rule 5. Never schedule anyone 7 days a week: real fix staff here work
   between 3.5 and 5 days.
3. Students should ONLY be scheduled on days they are available (morning, afternoon,
   or whole_day). Never schedule a student on a day marked "not_available".
4. Respect each student's desired hours as closely as possible — don't go over.
5. Use the shift windows that actually occur in this business. Pick the closest
   listed window rather than inventing times:
   - Student morning: 09:30–13:30, 10:30–16:00, 10:00–16:30
   - Student afternoon: 16:00–21:00 (by far the most common), 16:00–20:00, 17:00–21:00
   - Student whole day: 13:45–20:15, 10:45–19:15, 12:15–20:15
   - Fix staff: 09:30–17:30 (most common), 12:15–20:15, 13:15–21:15, 12:00–20:00, 09:30–18:00
6. Coverage: each store below lists its measured average headcount per day — aim for
   that level. Student demand peaks at the WEEKEND. Across two years, student shifts
   by weekday were: Sun 703, Sat 659, Wed 407, Fri 405, Mon 380, Thu 361, Tue 335.
   Staff Saturday and Sunday at least as heavily as Friday.
7. Breaks — two conditions, both must hold for 30min to be deducted:
   (a) the shift starts BEFORE 16:00, and (b) it is longer than 5h gross.
   A shift starting at 16:00 or later NEVER has a break, however long it runs,
   because staff start leaving between 18:00 and 20:00 and the store would be left
   short. So: 09:30–17:30 = 7h30 net, 09:30–18:00 = 8h net, 16:00–22:00 = 6h net
   (no break), 16:00–21:00 = 5h net, 10:00–15:00 = 5h net.
   The "hours" field you return must be NET hours.
8. Distribute students across stores fairly — avoid putting everyone in one store.
   Use ONLY the store ids listed under STORES. Never invent an id, and never fall back
   to some other store: if a store is not listed, it is not available this week.
9. The manager's note takes priority over general rules when there's a conflict.

Return a JSON array of shift objects. Each object must have exactly these fields:
- email (string)
- shift_date (string, format "YYYY-MM-DD")
- store_id (number)
- start_time (string, format "HH:MM")
- end_time (string, format "HH:MM")
- hours (number — net hours after break deduction)

Return ONLY the JSON array, no markdown, no explanation.`;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * How many days to schedule a fix employee who has no timetable yet.
 * Measured range is 3.5–4.9 days/week; contract hours divided by a typical ~8h
 * shift reproduces that well (38h → 5, 30h → 4, 19–20h → 2–3).
 */
function fallbackDayCount(contractHours: number | null): number {
  if (contractHours == null) return 4;
  return Math.min(5, Math.max(2, Math.round(contractHours / 8)));
}

function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm || "").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatFixUser(u: FixUser, weekDayKeys: string[]): string {
  const contractStr = u.contract_hours != null ? ` — contract: ${u.contract_hours}h/week` : "";
  const header = `- ${u.name} (${u.email}), default store_id: ${u.store_id ?? "none"}${contractStr}`;

  if (u.timetable.length === 0) {
    const days = fallbackDayCount(u.contract_hours);
    return `${header}\n  No timetable set — schedule exactly ${days} day(s) this week at their default store, using the fix windows from rule 5. Do NOT schedule all 7 days.`;
  }

  const label = (t: TimetableEntry) => {
    const storeStr = t.store_id != null ? `store_id ${t.store_id}` : "default store";
    return `${weekDayKeys[t.day_of_week]} (${DAY_NAMES[t.day_of_week]}) at ${storeStr}`;
  };

  // A timetable entry with no times is a day the employee works, but whose hours
  // are not fixed — those days absorb whatever is left of the contract.
  const fixed = u.timetable.filter((t) => t.start_time && t.end_time);
  const flexible = u.timetable.filter((t) => !t.start_time || !t.end_time);

  const lines = fixed.map((t) => `  FIXED  ${label(t)}: ${t.start_time}–${t.end_time}`);

  if (flexible.length > 0) {
    const days = flexible.map((t) => `  FLEXIBLE  ${label(t)}`).join("\n");
    if (u.contract_hours != null) {
      const committed = fixed.reduce((sum, t) => sum + netShiftHours(t.start_time, t.end_time), 0);
      const remaining = Math.max(0, u.contract_hours - committed);
      lines.push(days);
      lines.push(
        `  → The FIXED days above account for ${committed}h of this employee's ${u.contract_hours}h contract.` +
          ` Distribute the remaining ${remaining}h (net) across the FLEXIBLE days so the week totals exactly ${u.contract_hours}h.` +
          ` You do not have to use every flexible day, and the shifts may be different lengths.`,
      );
    } else {
      lines.push(days);
      lines.push(
        `  → No contract hours on record, so use a fix window from rule 5 (default 09:30–17:30) on the FLEXIBLE days.`,
      );
    }
  }

  return `${header}\n${lines.join("\n")}`;
}

function formatStore(s: Store): string {
  const coverage = STORE_COVERAGE[s.name] ?? DEFAULT_COVERAGE;
  return `- ${s.name} (id: ${s.id}) — typically ~${coverage} people per day`;
}

/**
 * Drop shifts that contradict the inputs, and collect warnings for the ones that
 * are merely questionable. Hard violations are removed because a schedule
 * containing them is not usable; soft ones are kept so the manager decides.
 */
function validateShifts(
  generated: GeneratedShift[],
  stores: Store[],
  fixUsers: FixUser[],
  studentAvailabilities: StudentAvailability[],
): { kept: GeneratedShift[]; warnings: string[] } {
  const validStoreIds = new Set(stores.map((s) => s.id));
  const studentByEmail = new Map(studentAvailabilities.map((s) => [s.email, s]));
  const fixByEmail = new Map(fixUsers.map((u) => [u.email, u]));

  const warnings: string[] = [];
  const seen = new Set<string>();
  const kept: GeneratedShift[] = [];

  for (const g of generated) {
    const student = studentByEmail.get(g.email);
    const fix = fixByEmail.get(g.email);

    if (!student && !fix) continue; // a person the model invented
    if (!validStoreIds.has(g.store_id)) continue;

    const dayKey = `${g.email}|${g.shift_date}`;
    if (seen.has(dayKey)) continue; // two shifts for one person on one day

    if (student) {
      const avail = student.days[g.shift_date];
      if (!avail || avail === "not_available") continue;
      const start = toMinutes(g.start_time);
      if (avail === "morning" && start >= AFTERNOON_CUTOFF_MIN) continue;
      if (avail === "afternoon" && start < AFTERNOON_CUTOFF_MIN) continue;
    }

    // Recompute hours rather than trusting the model's arithmetic: it reliably
    // deducts breaks the manager would not take (from 5h shifts, and from late
    // shifts of any length).
    // These numbers drive the contract/desired-hours checks below, so a wrong
    // one produces a wrong warning.
    seen.add(dayKey);
    kept.push({ ...g, hours: netShiftHours(g.start_time, g.end_time) || g.hours });
  }

  const dropped = generated.length - kept.length;
  if (dropped > 0) {
    warnings.push(
      `${dropped} generated shift${dropped === 1 ? "" : "s"} discarded (unavailable day, unknown person, or duplicate)`,
    );
  }

  const totals = new Map<string, number>();
  for (const g of kept) {
    totals.set(g.email, (totals.get(g.email) ?? 0) + (g.hours || 0));
  }

  for (const [email, total] of totals) {
    const student = studentByEmail.get(email);
    if (student && total > student.desiredHours) {
      warnings.push(`${student.name}: ${total}h scheduled but ${student.desiredHours}h requested`);
      continue;
    }
    // Fix employees should land ON their contract, not merely under it — flexible
    // timetable days exist precisely to make up the difference. Half an hour of
    // slack absorbs break-rule rounding without warning about it.
    const fix = fixByEmail.get(email);
    if (fix?.contract_hours != null && Math.abs(total - fix.contract_hours) > 0.5) {
      const dir = total > fix.contract_hours ? "over" : "under";
      warnings.push(`${fix.name}: ${total}h scheduled, ${dir} the ${fix.contract_hours}h contract`);
    }
  }

  return { kept, warnings };
}

export async function generatePlanning({
  stores,
  fixUsers,
  studentAvailabilities,
  weekDayKeys,
  managerNote,
  weekId,
}: {
  stores: Store[];
  fixUsers: FixUser[];
  studentAvailabilities: StudentAvailability[];
  weekDayKeys: string[];
  managerNote: string;
  weekId?: string;
}): Promise<{ shifts: Shift[]; error?: string; warnings?: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { shifts: [], error: "GEMINI_API_KEY is not configured. Add it to .env.local" };
  }

  const ai = new GoogleGenAI({ apiKey });

  // The "Other" store only means anything next to a free-text custom_store_name that an
  // admin types by hand, so the model must never pick it. Dropping it from the input
  // here — rather than filtering its shifts out afterwards — leaves it no id to choose
  // and nothing to discard.
  const schedulableStores = stores.filter((s) => !isOtherStore(s));

  const userMessage = `
STORES:
${schedulableStores.map(formatStore).join("\n")}

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

  const startedAt = Date.now();
  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        ...(THINKING_BUDGET != null ? { thinkingConfig: { thinkingBudget: THINKING_BUDGET } } : {}),
      },
    });

    const u = result.usageMetadata;
    console.log(
      "[gen] %dms  prompt=%d  thoughts=%d  output=%d  budget=%s",
      Date.now() - startedAt,
      u?.promptTokenCount ?? -1,
      u?.thoughtsTokenCount ?? -1,
      u?.candidatesTokenCount ?? -1,
      String(THINKING_BUDGET),
    );

    const text = result.text ?? "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // The request still reached the provider and still cost a unit of quota,
      // so it has to be logged even though nothing usable came back.
      await logAiGeneration({
        weekId,
        model: MODEL,
        outcome: "error",
        durationMs: Date.now() - startedAt,
        error: "Response contained no JSON array",
      });
      return { shifts: [], error: "Could not parse response from AI" };
    }

    const generated: GeneratedShift[] = JSON.parse(jsonMatch[0]);

    const { kept, warnings } = validateShifts(
      generated,
      schedulableStores,
      fixUsers,
      studentAvailabilities,
    );

    await logAiGeneration({
      weekId,
      model: MODEL,
      outcome: "success",
      shiftsKept: kept.length,
      durationMs: Date.now() - startedAt,
    });

    const shifts: Shift[] = kept.map((g, i) => ({
      id: -(i + 1),
      email: g.email,
      shift_date: g.shift_date,
      store_id: g.store_id,
      start_time: g.start_time,
      end_time: g.end_time,
      hours: g.hours,
      custom_store_name: null,
      absence_type: null,
      source: "ai",
    }));

    return { shifts, warnings: warnings.length > 0 ? warnings : undefined };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // A 429 means the daily quota is already gone — worth distinguishing in the
    // log so the counter can explain itself rather than just looking wrong.
    const rateLimited = /429|RESOURCE_EXHAUSTED|quota/i.test(message);
    await logAiGeneration({
      weekId,
      model: MODEL,
      outcome: rateLimited ? "rate_limited" : "error",
      durationMs: Date.now() - startedAt,
      error: message,
    });
    return {
      shifts: [],
      error: rateLimited
        ? "Daily AI request limit reached. It resets at midnight Pacific time."
        : message,
    };
  }
}

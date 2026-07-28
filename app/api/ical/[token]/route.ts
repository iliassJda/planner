import { NextResponse } from "next/server";
import ical from "ical-generator";
import { parse } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { verifyIcalToken, getUpcomingShiftsForUser, getStoresForApp } from "@/action/supabase";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const email = await verifyIcalToken(token);
  if (!email) {
    return new NextResponse("Not found", { status: 404 });
  }

  const [shifts, stores] = await Promise.all([getUpcomingShiftsForUser(email), getStoresForApp()]);

  const otherStore = stores.find((s) => s.name.toLowerCase().includes("other")) ?? null;

  const calendar = ical({ name: "Neuhaus Planning" });

  for (const shift of shifts) {
    const store = shift.store_id ? stores.find((s) => s.id === shift.store_id) : undefined;
    const storeName =
      (otherStore && shift.store_id === otherStore.id ? shift.custom_store_name : undefined) ||
      store?.name ||
      "Neuhaus";

    const start = fromZonedTime(
      parse(`${shift.shift_date} ${shift.start_time}`, "yyyy-MM-dd HH:mm", new Date()),
      "Europe/Brussels",
    );
    const end = fromZonedTime(
      parse(`${shift.shift_date} ${shift.end_time}`, "yyyy-MM-dd HH:mm", new Date()),
      "Europe/Brussels",
    );

    // Keyed by (email, date) rather than the row id: the scheduler clears and
    // re-inserts every shift on each save, so the id changes even when the
    // shift itself didn't. A stable UID lets calendar apps update the
    // existing event in place instead of dropping and re-adding it.
    calendar.createEvent({
      id: `${email.replace("@", "_at_")}-${shift.shift_date}@neuhaus-planner`,
      start,
      end,
      summary: storeName,
      location: storeName,
    });
  }

  return new NextResponse(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
    },
  });
}

type TimetableEntry = {
	day_of_week: number; // 0 = Mon, 6 = Sun
	start_time: string;
	end_time: string;
	store_id?: number | null;
};

type User = {
	first_name: string;
	nickname: string;
	email: string;
	image: string;
	// admin: boolean;
	role: RoleName;
	region: Region;
	allowed?: boolean;
	store_id?: number | null;
	contract_hours?: number | null;
};

type RoleName = "admin" | "student" | "fix";

type Week = {
	id: string;
	week_number: number;
	year: number;
	week_label: string;
	is_active: boolean;
	// created_at: string;
};

type AbsenceType = "sick" | "vacation" | "recup";

/**
 * Where a shift came from. Lets model output be told apart from the manager's own
 * scheduling if this table is ever mined for real staffing patterns.
 */
type ShiftSource = "manual" | "ai" | "ai_edited";

type Shift = {
	id: number;
	store_id: number | null;
	email: string;
	shift_date: string;
	start_time: string;
	end_time: string;
	hours: number;
	custom_store_name?: string | null;
	absence_type?: AbsenceType | null;
	absence_hours?: number | null;
	source?: ShiftSource;
};

type ShiftAssignment = {
	storeId: number | null;
	start: string;
	end: string;
	hours: number;
	customStoreName?: string;
	absenceType?: AbsenceType;
	absenceHours?: number;
	source?: ShiftSource;
};

type DayAvailability = "not_available" | "morning" | "afternoon" | "whole_day";

type Availability = {
	email: string;
	week_id: string;
	week_number: number;
	monday: DayAvailability;
	tuesday: DayAvailability;
	wednesday: DayAvailability;
	thursday: DayAvailability;
	friday: DayAvailability;
	saturday: DayAvailability;
	sunday: DayAvailability;
	hours: number;
	year: number;
	comment: string;
};

type Region = {
	id: number;
	name: string;
};

type Store = {
	id: number;
	name: string;
	region: Region;
};

type TicketCategory = "bug" | "feedback" | "question";

type TicketStatus = "open" | "in_progress" | "resolved";

/**
 * A ticket as shown to the client. Deliberately carries no email: the list is
 * shared with everyone in the pool, so the author is identified by display name
 * only and `is_mine` is resolved server-side against the session.
 */
type Ticket = {
	id: number;
	created_at: string;
	category: TicketCategory;
	message: string;
	status: TicketStatus;
	admin_response: string | null;
	author_name: string;
	is_mine: boolean;
};

/**
 * A ticket as seen in the triage view. Unlike `Ticket` this carries the
 * reporter's email and role: the whole point is knowing who filed what so you
 * can follow up, and the audience is the support allowlist only.
 */
type TriageTicket = Omit<Ticket, "is_mine"> & {
	email: string;
	author_role: RoleName;
	resolved_at: string | null;
};

export type {
	User,
	RoleName,
	Week,
	Availability,
	DayAvailability,
	Store,
	Region,
	ShiftAssignment,
	Shift,
	AbsenceType,
	ShiftSource,
	TimetableEntry,
	Ticket,
	TriageTicket,
	TicketCategory,
	TicketStatus,
};

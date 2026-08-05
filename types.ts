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
};

type ShiftAssignment = {
	storeId: number | null;
	start: string;
	end: string;
	hours: number;
	customStoreName?: string;
	absenceType?: AbsenceType;
	absenceHours?: number;
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
	TimetableEntry,
};

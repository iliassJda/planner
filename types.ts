type User = {
	first_name: string;
	email: string;
	image: string;
	// admin: boolean;
	role: RoleName;
	allowed?: boolean;
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

export type { User, RoleName, Week, Availability, DayAvailability };

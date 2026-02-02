type User = {
	name: string;
	email: string;
	image: string;
	admin: boolean;
};

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
	id?: string;
	user_email: string;
	week_id: string;
	monday: DayAvailability;
	tuesday: DayAvailability;
	wednesday: DayAvailability;
	thursday: DayAvailability;
	friday: DayAvailability;
	saturday: DayAvailability;
	sunday: DayAvailability;
	submitted_at?: string;
};

export type { User, Week, Availability, DayAvailability };

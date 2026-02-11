type User = {
	name?: string;
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
};

export type { User, Week, Availability, DayAvailability };

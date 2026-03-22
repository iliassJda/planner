type User = {
	first_name: string;
	email: string;
	image: string;
	// admin: boolean;
	role: RoleName;
	region: Region;
	allowed?: boolean;
};

type RoleName = "admin" | "user";

type Week = {
	id: string;
	week_number: number;
	year: number;
	week_label: string;
	is_active: boolean;
	// created_at: string;
};

type ShiftAssignment = {
	storeId: string;
	start: string;
	end: string;
	hours: number;
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

export type { User, RoleName, Week, Availability, DayAvailability, Store, Region, ShiftAssignment };

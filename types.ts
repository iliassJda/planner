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

type Availability = {
	id?: string;
	user_email: string;
	week_id: string;
	monday: boolean;
	tuesday: boolean;
	wednesday: boolean;
	thursday: boolean;
	friday: boolean;
	saturday: boolean;
	sunday: boolean;
	submitted_at?: string;
};

export type { User, Week, Availability };

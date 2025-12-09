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

export type { User, Week };

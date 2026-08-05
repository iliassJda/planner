import { format } from "date-fns";
import type ExcelJS from "exceljs";
import type { Shift, Store } from "@/types";
import type { EmployeeRow } from "@/app/(admin)/admin/maker/weekly-planner";
import { getShiftWorkedHours, getShiftAbsenceHours } from "@/help_functions";

type ExportParams = {
	currentWeek: string;
	weekDays: Date[];
	employeeRows: EmployeeRow[];
	stores: Store[];
	weekShifts: Shift[];
};

// Hex → { argb: "FF..." } for ExcelJS
function argb(hex: string): string {
	return "FF" + hex.replace("#", "");
}

function fmt(h: number): string {
	if (h <= 0) return "";
	const whole = Math.floor(h);
	const mins = Math.round((h - whole) * 60);
	return mins > 0 ? `${whole}h${mins.toString().padStart(2, "0")}` : `${whole}h`;
}

const STORE_COLORS: Array<{ keywords: string[]; bg: string; text: string }> = [
	{ keywords: ["galerie"], bg: "#fecdd3", text: "#881337" },
	{ keywords: ["beurre"], bg: "#ddd6fe", text: "#3b0764" },
	{ keywords: ["grand", "place"], bg: "#bbf7d0", text: "#14532d" },
	{ keywords: ["atelier"], bg: "#fed7aa", text: "#7c2d12" },
	{ keywords: ["mad", "madeleine"], bg: "#bfdbfe", text: "#1e3a8a" },
	{ keywords: ["louise"], bg: "#bae6fd", text: "#0c4a6e" },
];

const FALLBACK_BG = "#fef08a";
const FALLBACK_TEXT = "#713f12";

function getStoreColor(store: Store, allStores: Store[]): { bg: string; text: string } {
	const name = store.name.toLowerCase();
	const match = STORE_COLORS.find((c) => c.keywords.some((kw) => name.includes(kw)));
	if (match) return match;
	const idx = allStores.findIndex((s) => s.id === store.id);
	return { bg: FALLBACK_BG, text: FALLBACK_TEXT };
}

export async function exportWeekToExcel({
	currentWeek,
	weekDays,
	employeeRows,
	stores,
	weekShifts,
}: ExportParams) {
	const ExcelJS = (await import("exceljs")).default;
	const workbook = new ExcelJS.Workbook();
	const sheet = workbook.addWorksheet(currentWeek, {
		views: [{ state: "frozen", xSplit: 1, ySplit: 2 }],
	});

	const otherStore = stores.find((s) => s.name.toLowerCase().includes("other")) ?? null;
	const dayCount = weekDays.length; // 7
	const storeCount = stores.length;
	const totalCols = 1 + dayCount + storeCount + 2; // name + days + stores + absent + total

	// ── Column widths ─────────────────────────────────────────────────────────
	sheet.getColumn(1).width = 18;
	for (let d = 0; d < dayCount; d++) sheet.getColumn(2 + d).width = 16;
	for (let s = 0; s < storeCount; s++) sheet.getColumn(2 + dayCount + s).width = 8;
	sheet.getColumn(2 + dayCount + storeCount).width = 8;     // absent
	sheet.getColumn(2 + dayCount + storeCount + 1).width = 8; // total

	// ── Row 1: title ──────────────────────────────────────────────────────────
	sheet.mergeCells(1, 1, 1, totalCols);
	const titleCell = sheet.getCell(1, 1);
	titleCell.value = `Planning — ${currentWeek}`;
	titleCell.font = { bold: true, size: 14 };
	titleCell.alignment = { vertical: "middle", horizontal: "center" };
	sheet.getRow(1).height = 28;

	// ── Row 2: headers ────────────────────────────────────────────────────────
	const headerRow = sheet.getRow(2);
	headerRow.height = 32;

	const headerFill: ExcelJS.Fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: argb("#f1f5f9") },
	};
	const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 9, color: { argb: argb("#64748b") } };
	const headerBorder: Partial<ExcelJS.Borders> = {
		bottom: { style: "medium", color: { argb: argb("#cbd5e1") } },
	};

	function styleHeader(col: number, value: string, subValue?: string) {
		const cell = sheet.getCell(2, col);
		cell.value = subValue ? { richText: [{ text: value + "\n", font: { bold: true, size: 9 } }, { text: subValue, font: { bold: false, size: 8 } }] } : value;
		cell.font = headerFont;
		cell.fill = headerFill;
		cell.border = headerBorder;
		cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
	}

	styleHeader(1, "EMPLOYEE");
	weekDays.forEach((day, i) => {
		styleHeader(2 + i, format(day, "EEE").toUpperCase(), format(day, "d MMM"));
	});
	stores.forEach((store, i) => {
		const col = 2 + dayCount + i;
		const color = getStoreColor(store, stores);
		const cell = sheet.getCell(2, col);
		cell.value = store.name.length > 6 ? store.name.slice(0, 5) + "…" : store.name;
		cell.font = { bold: true, size: 8, color: { argb: argb(color.text) } };
		cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(color.bg) } };
		cell.border = headerBorder;
		cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
	});
	styleHeader(2 + dayCount + storeCount, "ABSENT");
	styleHeader(2 + dayCount + storeCount + 1, "TOTAL");

	// ── Employee rows ─────────────────────────────────────────────────────────
	const weekDayKeys = weekDays.map((d) => format(d, "yyyy-MM-dd"));

	employeeRows.forEach((entry, idx) => {
		const rowNum = 3 + idx;
		const row = sheet.getRow(rowNum);
		row.height = 36;

		const isFix = entry.user.role === "fix";
		const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
		const rowFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(rowBg) } };

		// Employee name cell
		const nameCell = sheet.getCell(rowNum, 1);
		const displayName = entry.user.nickname || entry.user.first_name;
		const assigned = weekShifts
			.filter((s) => s.email === entry.user.email && weekDayKeys.includes(s.shift_date))
			.reduce((sum, s) => sum + getShiftWorkedHours(s), 0);
		const target = entry.targetHours;
		const subText = assigned > 0
			? `${fmt(assigned)}${target != null ? ` / ${fmt(target)}` : ""}`
			: target != null ? `0 / ${fmt(target)}` : "";

		nameCell.value = subText
			? { richText: [{ text: displayName + "\n", font: { bold: true, size: 10 } }, { text: subText, font: { size: 8, color: { argb: argb("#94a3b8") } } }] }
			: displayName;
		nameCell.font = { bold: true, size: 10 };
		nameCell.alignment = { vertical: "middle", wrapText: true };
		nameCell.fill = rowFill;
		if (isFix) {
			nameCell.border = { left: { style: "medium", color: { argb: argb("#c084fc") } } };
		}

		// Day cells
		weekDayKeys.forEach((dayKey, d) => {
			const col = 2 + d;
			const cell = sheet.getCell(rowNum, col);
			const shift = weekShifts.find((s) => s.email === entry.user.email && s.shift_date === dayKey);
			const avail = entry.days[dayKey]?.availability;
			const isUnavailable = !avail || avail === "not_available";

			if (shift && (shift.store_id != null || shift.absence_type)) {
				const richText: { text: string; font?: Partial<ExcelJS.Font> }[] = [];
				let fillArgb: string | null = null;

				if (shift.store_id != null) {
					const store = stores.find((s) => s.id === shift.store_id);
					const color = store ? getStoreColor(store, stores) : null;
					const storeName = otherStore && shift.store_id === otherStore.id
						? shift.custom_store_name || store?.name || ""
						: store?.name || "";

					richText.push(
						{ text: `${shift.start_time}–${shift.end_time}\n`, font: { bold: true, size: 10, color: { argb: color ? argb(color.text) : argb("#0f172a") } } },
						{ text: `${fmt(shift.hours)}  ${storeName}`, font: { size: 8, color: { argb: color ? argb(color.text) : argb("#64748b") } } },
					);
					fillArgb = color ? argb(color.bg) : null;
				}

				if (shift.absence_type) {
					const absenceColors = {
						sick:     { bg: "#ffe4e6", text: "#be123c" },
						vacation: { bg: "#dbeafe", text: "#1d4ed8" },
						recup:    { bg: "#fef3c7", text: "#b45309" },
					};
					const ac = absenceColors[shift.absence_type];
					const label = shift.absence_type === "sick" ? "Sick" : shift.absence_type === "vacation" ? "Vacances" : "Récup";
					const absHours = getShiftAbsenceHours(shift);

					if (richText.length > 0) richText.push({ text: "\n" });
					richText.push({
						text: absHours > 0 ? `${label} ${fmt(absHours)}` : label,
						font: { bold: true, size: 9, color: { argb: argb(ac.text) } },
					});
					if (shift.store_id == null) fillArgb = argb(ac.bg);
				}

				cell.value = { richText };
				cell.fill = fillArgb
					? { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } }
					: rowFill;
			} else if (isUnavailable && !isFix) {
				cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("#f1f5f9") } };
				cell.value = "";
			} else {
				cell.value = "";
				cell.fill = rowFill;
			}

			cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
			cell.border = { right: { style: "thin", color: { argb: argb("#e2e8f0") } } };
		});

		// Store hour cells
		stores.forEach((store, s) => {
			const col = 2 + dayCount + s;
			const cell = sheet.getCell(rowNum, col);
			const h = weekShifts
				.filter((sh) => sh.email === entry.user.email && sh.store_id === store.id && weekDayKeys.includes(sh.shift_date))
				.reduce((sum, sh) => sum + sh.hours, 0);
			cell.value = h > 0 ? fmt(h) : "";
			cell.font = { size: 9, bold: h > 0 };
			cell.fill = rowFill;
			cell.alignment = { vertical: "middle", horizontal: "center" };
			cell.border = { right: { style: "thin", color: { argb: argb("#e2e8f0") } } };
		});

		// Absent cell
		const absentCol = 2 + dayCount + storeCount;
		const absentCell = sheet.getCell(rowNum, absentCol);
		const absent = target != null ? Math.max(0, target - assigned) : null;
		if (absent != null && absent > 0) {
			absentCell.value = fmt(absent);
			absentCell.font = { size: 9, bold: true, color: { argb: argb("#d97706") } };
		} else if (absent === 0 && assigned > 0) {
			absentCell.value = "✓";
			absentCell.font = { size: 9, color: { argb: argb("#10b981") } };
		} else {
			absentCell.value = "";
		}
		absentCell.fill = rowFill;
		absentCell.alignment = { vertical: "middle", horizontal: "center" };
		absentCell.border = { right: { style: "thin", color: { argb: argb("#e2e8f0") } } };

		// Total cell
		const totalCol = 2 + dayCount + storeCount + 1;
		const totalCell = sheet.getCell(rowNum, totalCol);
		totalCell.value = target != null ? fmt(target) : "";
		totalCell.font = { size: 9, bold: true };
		totalCell.fill = rowFill;
		totalCell.alignment = { vertical: "middle", horizontal: "center" };

		// Bottom border on every row
		for (let c = 1; c <= totalCols; c++) {
			const cell = sheet.getCell(rowNum, c);
			cell.border = {
				...cell.border,
				bottom: { style: "thin", color: { argb: argb("#e2e8f0") } },
			};
		}
	});

	// ── Summary row ───────────────────────────────────────────────────────────
	const summaryRowNum = 3 + employeeRows.length;
	const summaryRow = sheet.getRow(summaryRowNum);
	summaryRow.height = 28;
	const summaryFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb("#f1f5f9") } };
	const summaryFont: Partial<ExcelJS.Font> = { bold: true, size: 9, color: { argb: argb("#64748b") } };

	const summaryLabel = sheet.getCell(summaryRowNum, 1);
	summaryLabel.value = "Staff / Total";
	summaryLabel.font = summaryFont;
	summaryLabel.fill = summaryFill;
	summaryLabel.alignment = { vertical: "middle" };
	summaryLabel.border = { top: { style: "medium", color: { argb: argb("#cbd5e1") } } };

	weekDayKeys.forEach((dayKey, d) => {
		const col = 2 + d;
		const cell = sheet.getCell(summaryRowNum, col);
		const count = new Set(weekShifts.filter((s) => s.shift_date === dayKey).map((s) => s.email)).size;
		cell.value = count > 0 ? count : "";
		cell.font = { bold: true, size: 10, color: { argb: argb("#6366f1") } };
		cell.fill = summaryFill;
		cell.alignment = { vertical: "middle", horizontal: "center" };
		cell.border = {
			top: { style: "medium", color: { argb: argb("#cbd5e1") } },
			right: { style: "thin", color: { argb: argb("#e2e8f0") } },
		};
	});

	stores.forEach((store, s) => {
		const col = 2 + dayCount + s;
		const cell = sheet.getCell(summaryRowNum, col);
		const total = weekShifts
			.filter((sh) => sh.store_id === store.id && weekDayKeys.includes(sh.shift_date))
			.reduce((sum, sh) => sum + sh.hours, 0);
		cell.value = total > 0 ? fmt(total) : "";
		cell.font = { bold: true, size: 9 };
		cell.fill = summaryFill;
		cell.alignment = { vertical: "middle", horizontal: "center" };
		cell.border = {
			top: { style: "medium", color: { argb: argb("#cbd5e1") } },
			right: { style: "thin", color: { argb: argb("#e2e8f0") } },
		};
	});

	const grandTotalCell = sheet.getCell(summaryRowNum, 2 + dayCount + storeCount + 1);
	const grandTotal = weekShifts
		.filter((s) => weekDayKeys.includes(s.shift_date))
		.reduce((sum, s) => sum + getShiftWorkedHours(s), 0);
	grandTotalCell.value = grandTotal > 0 ? fmt(grandTotal) : "";
	grandTotalCell.font = { bold: true, size: 9 };
	grandTotalCell.fill = summaryFill;
	grandTotalCell.alignment = { vertical: "middle", horizontal: "center" };
	grandTotalCell.border = { top: { style: "medium", color: { argb: argb("#cbd5e1") } } };

	// ── Download ──────────────────────────────────────────────────────────────
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `planning-${currentWeek.replace(/\s+/g, "-")}.xlsx`;
	a.click();
	URL.revokeObjectURL(url);
}

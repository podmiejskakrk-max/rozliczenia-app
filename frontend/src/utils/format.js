/**
 * Formatuje kwotę w polskim stylu: 47 682,61 zł
 */
export function formatKwota(value, showZl = true) {
  if (value === null || value === undefined) return "—";
  const num = parseFloat(value);
  if (isNaN(num)) return "—";

  const formatted = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  return showZl ? `${formatted} zł` : formatted;
}

/**
 * Formatuje datę w stylu DD.MM.RRRR
 */
export function formatData(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formatuje procent z jednym miejscem dziesiętnym
 */
export function formatProcent(value) {
  if (value === null || value === undefined) return "—";
  return `${parseFloat(value).toFixed(2).replace(".", ",")} %`;
}

/**
 * Konwertuje datę ISO (YYYY-MM-DD) na format dla inputa date
 */
export function toInputDate(dateStr) {
  if (!dateStr) return "";
  return dateStr.split("T")[0];
}

/**
 * Konwertuje "2025-01" na "sty 2025"
 */
export function formatMiesiac(yearMonth) {
  if (!yearMonth) return "";
  const [year, month] = yearMonth.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString("pl-PL", { month: "short", year: "numeric" });
}

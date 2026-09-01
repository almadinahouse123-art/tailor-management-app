// Lightweight CSV export helper (Excel-friendly, no external libraries).

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: Record<string, unknown>[], columns?: { key: string; label?: string }[]) {
  if (!rows.length && !columns?.length) return "";
  const cols =
    columns ??
    Object.keys(rows[0] ?? {}).map((k) => ({ key: k, label: k }));
  const head = cols.map((c) => cell(c.label ?? c.key)).join(",");
  const body = rows.map((r) => cols.map((c) => cell(r[c.key])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob(["\uFEFF", content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCSV(
  fileBase: string,
  rows: Record<string, unknown>[],
  columns?: { key: string; label?: string }[],
) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(`${fileBase}-${stamp}.csv`, toCSV(rows, columns), "text/csv");
}

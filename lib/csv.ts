// lib/csv.ts

export function parseCsv(
  raw: string,
  delimiter = ","
): { header: string[]; rows: string[][] } {
  let text = raw.replace(/^\uFEFF/, "");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const len = text.length;

  for (let i = 0; i < len; i++) {
    const ch = text[i];
    const next = i + 1 < len ? text[i + 1] : "";

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\r" && next === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  rows.push(row);

  const nonEmpty = rows.filter(r => !(r.length === 1 && r[0] === ""));
  const header = nonEmpty[0] ?? [];
  const data = nonEmpty.slice(1);

  return { header, rows: data };
}
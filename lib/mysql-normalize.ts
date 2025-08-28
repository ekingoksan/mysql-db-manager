// lib/mysql-normalize.ts

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toMysqlDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toMysqlTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function toMysqlDateTime(d: Date) {
  return `${toMysqlDate(d)} ${toMysqlTime(d)}`;
}

// "date" | "time" | "datetime" | "timestamp" gibi tiplere uygun biçim ver
export function normalizeTemporal(value: string, mysqlType: string): string {
  const t = mysqlType.toLowerCase();

  if (t === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if ((t === "time" || t === "timetz") && /^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  if (
    (t.includes("datetime") || t.includes("timestamp")) &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/.test(value)
  )
    return value;

  const d = new Date(value);
  if (isNaN(d.getTime())) return value;

  if (t === "date") return toMysqlDate(d);
  if (t === "time" || t === "timetz") return toMysqlTime(d);
  if (t.includes("datetime") || t.includes("timestamp")) return toMysqlDateTime(d);

  return value;
}

// Boole yorumlayıcı (tinyint(1) / boolean)
function normalizeBoolean(value: string) {
  const v = String(value).trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return 1;
  if (v === "0" || v === "false" || v === "no" || v === "off") return 0;
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? 1 : 0;
}

// Genel tip normalizasyonu: boş string → null, sayılar, boolean, json, temporal...
export function normalizeForType(value: string, mysqlType: string): any {
  if (value === "" || value === null || value === undefined) return null;

  const t = mysqlType.toLowerCase();

  if (t.includes("int")) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : value;
  }

  if (
    t.includes("decimal") ||
    t.includes("numeric") ||
    t.includes("float") ||
    t.includes("double") ||
    t.includes("real")
  ) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : value;
  }

  if (t === "tinyint(1)" || t === "boolean" || t === "bool") {
    return normalizeBoolean(value);
  }

  if (t === "json") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  if (t === "date" || t === "time" || t.includes("datetime") || t.includes("timestamp")) {
    return normalizeTemporal(value, t);
  }

  return value; // varsayılan string
}
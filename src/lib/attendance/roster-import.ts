export type RosterRow = {
  name: string;
  college_id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
};
const clean = (value: unknown) => String(value ?? "").trim();
export function parseRosterRows(input: unknown[][]): {
  rows: RosterRow[];
  errors: string[];
} {
  const aliases = {
    name: ["name", "studentname", "fullname"],
    first: ["firstname", "officialfirstname"],
    last: ["lastname", "officiallastname"],
    id: ["id", "studentid", "collegeid", "studentidnumber"],
    email: ["email", "emailaddress", "googleemail"],
  };
  const headerIndex = input.findIndex((row) => {
    const h = row.map((v) =>
      clean(v)
        .toLowerCase()
        .replace(/[^a-z]/g, ""),
    );
    return (
      h.some((v) => [...aliases.id,...aliases.email].includes(v)) &&
      h.some((v) => [...aliases.name, ...aliases.first].includes(v))
    );
  });
  if (headerIndex < 0)
    return {
      rows: [],
      errors: [
        "Could not find the roster headers. Use Name (or First Name and Last Name), with Email or College ID.",
      ],
    };
  const headers = input[headerIndex].map((v) =>
    clean(v)
      .toLowerCase()
      .replace(/[^a-z]/g, ""),
  );
  const index = (key: keyof typeof aliases) =>
    headers.findIndex((v) => aliases[key].includes(v));
  const rows: RosterRow[] = [];
  const errors: string[] = [];
  const ids = new Set<string>(),
    emails = new Set<string>();
  input.slice(headerIndex + 1).forEach((row, i) => {
    if (row.every((v) => !clean(v))) return;
    const name =
      index("name") >= 0
        ? clean(row[index("name")])
        : [clean(row[index("first")]), clean(row[index("last")])]
            .filter(Boolean)
            .join(" ");
    const college_id = clean(row[index("id")]);
    const email = clean(row[index("email")]).toLowerCase() || null;
    const line = headerIndex + i + 2;
    if (!name)
      errors.push(`Row ${line}: name is required.`);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push(`Row ${line}: email is invalid.`);
    if ((college_id && ids.has(college_id)) || (email && emails.has(email)))
      errors.push(`Row ${line}: duplicate College ID or email.`);
    if (college_id) ids.add(college_id);
    if (email) emails.add(email);
    rows.push({ name, college_id, email, first_name: clean(row[index('first')]) || null, last_name: clean(row[index('last')]) || null });
  });
  if (!rows.length) errors.push("This file has no student rows.");
  return { rows, errors };
}
export async function readRoster(file: File) {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Choose a roster smaller than 5 MB.");
  if (/\.csv$/i.test(file.name)) {
    const Papa = (await import("papaparse")).default;
    const parsed = Papa.parse<string[]>(await file.text(), {
      skipEmptyLines: true,
    });
    if (parsed.errors.length)
      throw new Error(
        "The CSV contains malformed rows. Please check the file.",
      );
    return parseRosterRows(parsed.data);
  }
  if (!/\.xlsx?$/i.test(file.name))
    throw new Error("Choose a CSV, XLS, or XLSX file.");
  const XLSX = await import("xlsx");
  const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return parseRosterRows(
    XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[book.SheetNames[0]], {
      header: 1,
      raw: false,
      defval: "",
    }),
  );
}

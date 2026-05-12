import { execFileSync } from "node:child_process";
import fs from "node:fs";

const exportPath = process.argv[2];
const outPath = process.argv[3] ?? "live-404-check.csv";

if (!exportPath) {
  console.error("Usage: node scripts/check-gsc-404-export.mjs <search-console-zip> [output.csv]");
  process.exit(1);
}

const csv = execFileSync("unzip", ["-p", exportPath, "Table.csv"], { encoding: "utf8" });
function parseCsv(input) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    const next = input[index + 1];

    if (inQuotes && char === '"' && next === '"') {
      value += '"';
      index++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index++;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

const [, ...dataRows] = parseCsv(csv);
const rows = dataRows.map(([url, lastCrawled]) => ({ url, lastCrawled }));

async function check(row) {
  let current = row.url;
  const chain = [];

  try {
    for (let hop = 0; hop < 10; hop++) {
      const response = await fetch(current, { method: "GET", redirect: "manual" });
      const location = response.headers.get("location");
      chain.push({ url: current, status: response.status, location });

      if (response.status >= 300 && response.status < 400 && location) {
        current = new URL(location, current).toString();
        continue;
      }

      const firstStatus = chain[0].status;
      const finalStatus = response.status;
      let classification = "other";
      if (finalStatus === 404) classification = "still_404";
      else if (finalStatus === 200 && chain.length > 1) classification = "fixed_redirect_to_200";
      else if (finalStatus === 200) classification = "direct_200";
      else classification = "non_200";

      return {
        ...row,
        firstStatus,
        finalStatus,
        finalUrl: current,
        hops: chain.length - 1,
        classification,
        chain: chain.map((entry) => `${entry.status}:${entry.url}`).join(" > "),
      };
    }

    return {
      ...row,
      firstStatus: chain[0]?.status ?? "",
      finalStatus: "too_many_redirects",
      finalUrl: current,
      hops: chain.length,
      classification: "too_many_redirects",
      chain: chain.map((entry) => `${entry.status}:${entry.url}`).join(" > "),
    };
  } catch (error) {
    return {
      ...row,
      firstStatus: "",
      finalStatus: "error",
      finalUrl: current,
      hops: chain.length,
      classification: "error",
      chain: error instanceof Error ? error.message : String(error),
    };
  }
}

let index = 0;
const results = [];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (index < rows.length) {
      const row = rows[index++];
      results.push(await check(row));
    }
  }),
);

results.sort((a, b) => rows.findIndex((row) => row.url === a.url) - rows.findIndex((row) => row.url === b.url));

const columns = ["url", "lastCrawled", "classification", "firstStatus", "finalStatus", "finalUrl", "hops", "chain"];
const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
fs.writeFileSync(outPath, [columns.join(","), ...results.map((result) => columns.map((column) => escapeCsv(result[column])).join(","))].join("\n") + "\n");

const counts = results.reduce((memo, result) => {
  memo[result.classification] = (memo[result.classification] ?? 0) + 1;
  return memo;
}, {});

console.log(`checked=${results.length}`);
console.log(JSON.stringify(counts, null, 2));
console.log(`report=${outPath}`);

for (const result of results.filter((item) => item.classification === "still_404").slice(0, 100)) {
  console.log(`STILL_404 ${result.url} last=${result.lastCrawled}`);
}

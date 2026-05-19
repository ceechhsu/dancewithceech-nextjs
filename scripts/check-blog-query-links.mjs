import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scannedDirs = ["src/app", "src/components", "src/lib"];
const forbiddenPatterns = [/\/blog\?category=/, /blog\?category=/];
const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

for (const dir of scannedDirs) {
  for (const file of walk(path.join(root, dir))) {
    const source = fs.readFileSync(file, "utf8");
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(source)) {
        failures.push(`${path.relative(root, file)} contains ${pattern}`);
      }
    }
  }
}

const houseDanceRoute = path.join(root, "src/app/house-dance/page.tsx");
if (!fs.existsSync(houseDanceRoute)) {
  failures.push("src/app/house-dance/page.tsx is missing");
}

const nextConfig = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
if (nextConfig.includes('type: "query"') && nextConfig.includes('key: "category"')) {
  failures.push("next.config.ts uses query redirects that preserve category parameters");
}

if (failures.length > 0) {
  console.error("Blog category crawl cleanup failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Blog category crawl cleanup passed.");

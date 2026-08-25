import fs from "node:fs";

const homepage = fs.readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const nav = fs.readFileSync(new URL("../src/components/Nav.tsx", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

if (!styles.includes("--accent-primary-accessible: #60A5FA")) {
  throw new Error("The accessible accent color is missing.");
}

if (homepage.includes('color: "var(--accent-primary)"')) {
  throw new Error("Homepage text still uses the low-contrast primary blue.");
}

if (nav.includes('color: "#2563EB"')) {
  throw new Error("The navigation brand still uses the low-contrast primary blue.");
}

console.log("Homepage and navigation accent text uses the accessible blue.");

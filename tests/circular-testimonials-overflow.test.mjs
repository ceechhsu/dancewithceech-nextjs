import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(
  path.join(root, "src/components/ui/circular-testimonials.tsx"),
  "utf8"
);

test("testimonial stack clips translated cards horizontally on narrow screens", () => {
  assert.match(
    source,
    /className="w-full max-w-4xl px-4 py-8 mx-auto overflow-x-clip"/
  );
});

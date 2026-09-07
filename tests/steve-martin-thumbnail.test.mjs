import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Steve Martin post has the slug-based thumbnail expected by blog cards", () => {
  const thumbnail = path.join(
    process.cwd(),
    "public/images/posts/steve-martin-dance.jpg",
  );

  assert.equal(
    fs.existsSync(thumbnail),
    true,
    "Expected public/images/posts/steve-martin-dance.jpg to exist",
  );
});

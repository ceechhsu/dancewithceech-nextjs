import assert from "node:assert/strict";
import test from "node:test";

import { COHORT } from "../src/lib/running-man/config";
import { CURRENT_TERMS_VERSION } from "../src/lib/running-man/terms";

test("running man cohort configuration has the published prices and cutoff", () => {
  assert.deepEqual(
    COHORT.tiers.map((tier) => tier.priceCents),
    [19700, 24700, 29700],
  );
  assert.equal(COHORT.cutoffIso, "2026-09-18T06:59:00.000Z");
  assert.equal(COHORT.coaching.priceCents, 10000);
  assert.equal(CURRENT_TERMS_VERSION, "running-man-2026-08-22");
});

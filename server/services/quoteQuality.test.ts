import assert from "node:assert/strict";
import test from "node:test";
import { isCompleteVerbatimQuote, quoteLimitForDepth } from "./quoteQuality";

const source = [
  "This is ordinary setup for the argument.",
  "A free society survives disagreement only when citizens defend the rights of people they oppose.",
  "The next section explains why",
].join(" ");

test("accepts a self-contained verbatim point", () => {
  assert.equal(
    isCompleteVerbatimQuote(
      source,
      "A free society survives disagreement only when citizens defend the rights of people they oppose.",
    ),
    true,
  );
});

test("rejects fragments, ellipses, and text that is not verbatim", () => {
  assert.equal(isCompleteVerbatimQuote(source, "The next section explains why"), false);
  assert.equal(isCompleteVerbatimQuote(source, "...citizens defend the rights of people they oppose."), false);
  assert.equal(isCompleteVerbatimQuote(source, "A free society requires agreement."), false);
});

test("keeps extraction limits selective at every depth", () => {
  assert.equal(quoteLimitForDepth(1), 1);
  assert.equal(quoteLimitForDepth(5), 3);
  assert.equal(quoteLimitForDepth(10), 5);
  assert.equal(quoteLimitForDepth(99), 5);
});

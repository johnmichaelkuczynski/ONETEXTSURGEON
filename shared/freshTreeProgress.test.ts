import assert from "node:assert/strict";
import test from "node:test";
import { nextFreshTreeDepth } from "./freshTreeProgress";

test("ADD NEXT TIER advances from the completed depth instead of sending the obsolete depth 2", () => {
  const trees = [{
    statements: [{ depth: 0 }, { depth: 1 }, { depth: 2 }, { depth: 3 }],
    progress: { completedDepth: 4 },
  }];

  assert.equal(nextFreshTreeDepth(trees), 5);
  assert.ok(nextFreshTreeDepth(trees) >= 4);
});

test("multiple trees advance together from their deepest completed tree", () => {
  const trees = [
    { statements: [{ depth: 3 }], progress: { completedDepth: 4 } },
    { statements: [{ depth: 4 }], progress: { completedDepth: 5 } },
    { statements: [{ depth: 3 }], progress: { completedDepth: 4 } },
  ];

  assert.equal(nextFreshTreeDepth(trees), 6);
});

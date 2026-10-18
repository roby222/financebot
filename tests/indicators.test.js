import test from "node:test";
import assert from "node:assert/strict";
import {
  calcRSI,
  calcEMA,
  calcMACD,
  calcSMA,
  calcBollinger,
  pivotPoints,
} from "../static/js/core/indicators.js";

test("indicators require enough history", () => {
  assert.equal(calcRSI([1, 2]), null);
  assert.equal(calcSMA([1, 2], 3), null);
  assert.equal(calcBollinger([1, 2]), null);
});
test("RSI identifies uninterrupted gains and losses", () => {
  assert.equal(calcRSI(Array.from({ length: 30 }, (_, i) => i + 1)), 100);
  assert.equal(calcRSI(Array.from({ length: 30 }, (_, i) => 30 - i)), 0);
});
test("moving averages and flat Bollinger bands preserve a constant series", () => {
  const values = Array(60).fill(42);
  assert.equal(calcSMA(values, 50), 42);
  assert.ok(calcEMA(values, 12).every((x) => x === 42));
  assert.deepEqual(calcBollinger(values), { upper: 42, mid: 42, lower: 42 });
  assert.equal(calcMACD(values), 0);
});
test("pivot levels use the previous high, low and close", () => {
  assert.deepEqual(pivotPoints(110, 90, 100), {
    PP: 100,
    R1: 110,
    R2: 120,
    R3: 130,
    S1: 90,
    S2: 80,
    S3: 70,
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import { btp_ytmAt, btp_netYield } from "../static/js/core/bonds.js";
import { compositeSignal } from "../static/js/features/etf/signals.js";
import { state } from "../static/js/core/state.js";

test("a bond at par yields its coupon and retains the existing net approximation", () => {
  const bond = { coupon: 4, mat: "2055-10-01" };
  assert.equal(btp_ytmAt(bond, 100), 4);
  assert.equal(btp_netYield(bond, 100), 3.5);
  assert.ok(btp_ytmAt(bond, 95) > 4);
  assert.ok(btp_ytmAt(bond, 105) < 4);
});
test("variable-rate instruments and matured bonds do not get a fixed-coupon yield", () => {
  for (const special of ["idx", "step", "etf"])
    assert.equal(
      btp_ytmAt({ special, coupon: 4, mat: "2055-10-01" }, 100),
      null,
    );
  assert.equal(btp_ytmAt({ coupon: 4, mat: "2000-01-01" }, 100), null);
});
test("technical signals preserve buy/sell thresholds and the extreme downtrend cap", () => {
  state.scenario = "neutro";
  state.macroRegime = null;
  state.macroData = {};
  assert.equal(
    compositeSignal(null, null, 100, null, null, null, "EQUITY", "risk-on"),
    null,
  );
  assert.equal(
    compositeSignal(
      20,
      1,
      100,
      { lower: 101, mid: 105, upper: 110 },
      95,
      105,
      "EQUITY",
      "risk-on",
    ).cls,
    "sig-buy-strong",
  );
  assert.equal(
    compositeSignal(
      80,
      -1,
      110,
      { lower: 90, mid: 100, upper: 109 },
      120,
      100,
      "EQUITY",
      "risk-on",
    ).cls,
    "sig-sell-strong",
  );
  const capped = compositeSignal(
    20,
    1,
    80,
    { lower: 85, mid: 90, upper: 95 },
    100,
    90,
    "EQUITY",
    "risk-on",
  );
  assert.equal(capped.cls, "sig-hold");
});

import test from "node:test";
import assert from "node:assert/strict";
import { validateReading } from "../src/validation.js";

const today = new Date().toISOString().slice(0, 10);

test("accepts a valid reading", () => {
  assert.deepEqual(validateReading({ date: today, slot: "Morning (fasting)", value: 100 }), []);
});

test("requires a glucose value", () => {
  assert.ok(validateReading({ date: today, slot: "Morning (fasting)", value: "" })
    .includes("Please enter a glucose value."));
});

test("rejects values outside 40 to 600", () => {
  assert.ok(validateReading({ date: today, slot: "Morning (fasting)", value: 39 })
    .includes("Value must be between 40 and 600 mg/dl."));
  assert.ok(validateReading({ date: today, slot: "Morning (fasting)", value: 601 })
    .includes("Value must be between 40 and 600 mg/dl."));
});

test("rejects decimal values", () => {
  assert.ok(validateReading({ date: today, slot: "Morning (fasting)", value: 90.5 })
    .includes("Value must be between 40 and 600 mg/dl."));
});

test("rejects future dates", () => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  assert.ok(validateReading({ date: tomorrow, slot: "Morning (fasting)", value: 100 })
    .includes("Date cannot be in the future."));
});

test("rejects unknown slots", () => {
  assert.ok(validateReading({ date: today, slot: "Bedtime", value: 100 })
    .includes("Please select a valid time slot."));
});

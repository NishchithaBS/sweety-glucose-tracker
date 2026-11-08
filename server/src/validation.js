export const SLOTS = [
  "Morning (fasting)",
  "After breakfast",
  "After lunch",
  "After dinner"
];

export function validateReading({ date, slot, value }) {
  const errors = [];
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push("Please select a valid date.");
  } else {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      errors.push("Please select a valid date.");
    } else {
      const today = new Date().toISOString().slice(0, 10);
      if (date > today) errors.push("Date cannot be in the future.");
    }
  }

  if (!SLOTS.includes(slot)) errors.push("Please select a valid time slot.");

  if (value === "" || value === null || value === undefined) {
    errors.push("Please enter a glucose value.");
  } else if (!Number.isInteger(Number(value)) || Number(value) < 40 || Number(value) > 600) {
    errors.push("Value must be between 40 and 600 mg/dl.");
  }
  return errors;
}

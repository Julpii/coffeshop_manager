// All money maths is done in integer cents (sen) to avoid floating point errors.
export const toCents = (value) => Math.round(Number(value) * 100);
export const fromCents = (cents) => cents / 100;

/** lines: [{ unitCents, quantity }], taxRate: percent (6 = 6%). Tax is added on top of prices. */
export function calcTotals(lines, taxRate) {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
  const taxCents = Math.round((subtotalCents * taxRate) / 100);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

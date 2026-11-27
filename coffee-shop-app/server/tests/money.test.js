import test from 'node:test';
import assert from 'node:assert/strict';
import { calcTotals, toCents } from '../src/utils/money.js';

test('toCents avoids floating point errors', () => {
  assert.equal(toCents(12.35), 1235);
  assert.equal(toCents('0.1') + toCents('0.2'), 30);
});

test('no tax by default', () => {
  const t = calcTotals([{ unitCents: 1000, quantity: 2 }, { unitCents: 750, quantity: 1 }], 0);
  assert.deepEqual(t, { subtotalCents: 2750, taxCents: 0, totalCents: 2750 });
});

test('tax is added on top and rounded to the nearest sen', () => {
  const t = calcTotals([{ unitCents: 1050, quantity: 1 }], 6); // 10.50 * 6% = 0.63
  assert.deepEqual(t, { subtotalCents: 1050, taxCents: 63, totalCents: 1113 });
  assert.equal(calcTotals([{ unitCents: 1005, quantity: 1 }], 6).taxCents, 60); // 60.3 -> 60
});

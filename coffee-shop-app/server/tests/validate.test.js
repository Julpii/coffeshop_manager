import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrderInput } from '../src/utils/validate.js';

const base = {
  items: [{ productId: 1, quantity: 2 }],
  diningMethod: 'Dine In',
  payment: { method: 'Cash', amountReceived: 20 },
};

test('accepts a valid cash order and merges duplicate products', () => {
  const o = parseOrderInput({ ...base, items: [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }], customerName: '  Aina ' });
  assert.deepEqual(o.items, [{ productId: 1, quantity: 3 }]);
  assert.equal(o.customerName, 'Aina');
  assert.equal(o.amountReceived, 20);
});

test('rejects empty orders, bad quantities and bad dining method', () => {
  assert.throws(() => parseOrderInput({ ...base, items: [] }), /no items/);
  assert.throws(() => parseOrderInput({ ...base, items: [{ productId: 1, quantity: 0 }] }), /Quantity/);
  assert.throws(() => parseOrderInput({ ...base, items: [{ productId: 1, quantity: 1.5 }] }), /Quantity/);
  assert.throws(() => parseOrderInput({ ...base, diningMethod: 'Drive Thru' }), /Dine In/);
});

test('card and QR need an explicit manual confirmation', () => {
  assert.throws(() => parseOrderInput({ ...base, payment: { method: 'Card' } }), /Confirm the payment/);
  assert.equal(parseOrderInput({ ...base, payment: { method: 'Card', confirmed: true } }).paymentMethod, 'Card');
});

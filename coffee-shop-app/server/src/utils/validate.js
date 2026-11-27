import { HttpError } from '../middleware/error.js';

export const DINING = ['Dine In', 'Take Away'];
export const PAYMENTS = ['Cash', 'Card', 'E-Wallet/QR'];

export const cleanText = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Checks the body of POST /api/orders and returns clean values. Throws HttpError(400) if invalid. */
export function parseOrderInput(body = {}) {
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) throw new HttpError(400, 'The order has no items');
  if (items.length > 50) throw new HttpError(400, 'Too many different items in one order');

  const merged = new Map();
  for (const it of items) {
    const productId = Number(it?.productId);
    const quantity = Number(it?.quantity);
    if (!Number.isInteger(productId) || productId <= 0) throw new HttpError(400, 'Invalid product in order');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new HttpError(400, 'Quantity must be between 1 and 99');
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }
  for (const q of merged.values()) if (q > 99) throw new HttpError(400, 'Quantity must be between 1 and 99');

  if (!DINING.includes(body.diningMethod)) throw new HttpError(400, 'Choose Dine In or Take Away');
  const method = body.payment?.method;
  if (!PAYMENTS.includes(method)) throw new HttpError(400, 'Choose a payment method');

  let amountReceived = null;
  if (method === 'Cash') {
    amountReceived = Number(body.payment?.amountReceived);
    if (!Number.isFinite(amountReceived) || amountReceived < 0) throw new HttpError(400, 'Enter the cash amount received');
  } else if (body.payment?.confirmed !== true) {
    throw new HttpError(400, 'Confirm the payment before checking out');
  }

  const key = cleanText(body.idempotencyKey, 64);
  return {
    items: [...merged].map(([productId, quantity]) => ({ productId, quantity })),
    customerName: cleanText(body.customerName, 100) || null,
    diningMethod: body.diningMethod,
    notes: cleanText(body.notes, 500) || null,
    paymentMethod: method,
    amountReceived,
    idempotencyKey: key || null,
  };
}

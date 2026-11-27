export const money = (n) => `RM ${Number(n || 0).toFixed(2)}`;
export const toCents = (n) => Math.round(Number(n) * 100);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The server sends "2026-10-11 14:05:00" in shop time; we show it as-is (no time zone conversion).
export function dateTime(s) {
  if (!s) return '-';
  const [d, t = ''] = s.split(' ');
  const [y, m, day] = d.split('-');
  return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}, ${t.slice(0, 5)}`;
}
export const timeOnly = (s) => (s ? s.split(' ')[1]?.slice(0, 5) : '-');
export const shortDay = (s) => `${Number(s.slice(8, 10))} ${MONTHS[Number(s.slice(5, 7)) - 1]}`;

export const itemsSummary = (order) => order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ');

export const newKey = () =>
  globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

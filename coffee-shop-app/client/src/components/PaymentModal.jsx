import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { money, toCents, newKey } from '../format.js';
import { ErrorBox, Modal } from './ui.jsx';

const METHODS = [
  { id: 'Card', label: 'Credit/Debit Card', hint: 'Customer pays on the card terminal' },
  { id: 'E-Wallet/QR', label: 'E-Wallet / QR Pay', hint: 'Customer scans the shop QR code' },
  { id: 'Cash', label: 'Cash', hint: 'Enter the amount received' },
];

function Summary({ cart, totals, taxRate }) {
  return (
    <aside className="rounded-xl border border-latte bg-white p-4">
      <h3 className="mb-3 text-lg font-bold">Order summary</h3>
      <ul className="mb-3 space-y-1 text-sm">
        {cart.map((l) => (
          <li key={l.product.id} className="flex justify-between gap-2">
            <span>{l.qty}× {l.product.name}</span>
            <span>{money(l.product.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-1 border-t border-latte pt-3 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
        {taxRate > 0 && <div className="flex justify-between"><dt>Tax ({taxRate}%)</dt><dd>{money(totals.tax)}</dd></div>}
        <div className="flex justify-between text-base font-bold text-espresso"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
      </dl>
    </aside>
  );
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];

export default function PaymentModal({ cart, totals, taxRate, order, onClose, onDone }) {
  const [step, setStep] = useState('method');
  const [amount, setAmount] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const key = useMemo(newKey, []); // one key per checkout, so double clicks never create two orders

  const received = toCents(amount || 0);
  const changeCents = received - toCents(totals.total);
  const cashOk = amount !== '' && changeCents >= 0;

  function press(k) {
    setAmount((a) => {
      if (k === '⌫') return a.slice(0, -1);
      if (k === '.' && (a.includes('.') || a === '')) return k === '.' && a === '' ? '0.' : a;
      if (a.includes('.') && a.split('.')[1].length >= 2) return a;
      if (a.length >= 8) return a;
      return a + k;
    });
  }

  async function checkout() {
    setBusy(true);
    setError('');
    try {
      const payment = step === 'cash' ? { method: 'Cash', amountReceived: Number(amount) }
        : { method: step === 'card' ? 'Card' : 'E-Wallet/QR', confirmed: true };
      const saved = await api('/orders', {
        method: 'POST',
        body: {
          items: cart.map((l) => ({ productId: l.product.id, quantity: l.qty })),
          customerName: order.customerName, diningMethod: order.diningMethod, notes: order.notes,
          payment, idempotencyKey: key,
        },
      });
      setResult(saved);
      setStep('done');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (step === 'done') {
    return (
      <Modal title="Order placed" onClose={onDone}>
        <div className="space-y-2 text-sm">
          <p className="text-3xl font-bold text-espresso">{result.invoice}</p>
          <p>Queue number <strong>{result.orderNo}</strong> · {result.diningMethod} · {result.paymentMethod}</p>
          <p>Total <strong>{money(result.total)}</strong></p>
          {result.paymentMethod === 'Cash' && <p className="text-lg">Change: <strong>{money(result.changeGiven)}</strong></p>}
          {result.paymentMode === 'manual_confirmation' && (
            <p className="rounded-lg bg-crema p-3 text-mocha">Payment was confirmed by the cashier. The app did not process this payment.</p>
          )}
        </div>
        <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={onDone} autoFocus>New order</button></div>
      </Modal>
    );
  }

  return (
    <Modal title="Payment" onClose={busy ? () => {} : onClose} wide>
      <div className="grid gap-5 md:grid-cols-[1fr_300px]">
        <div>
          {step === 'method' && (
            <div className="grid gap-3 sm:grid-cols-3">
              {METHODS.map((m) => (
                <button key={m.id} onClick={() => setStep(m.id === 'Cash' ? 'cash' : m.id === 'Card' ? 'card' : 'qr')}
                  className="rounded-xl border-2 border-latte bg-white p-5 text-left transition-colors hover:border-caramel">
                  <span className="block font-display text-lg font-bold text-espresso">{m.label}</span>
                  <span className="mt-1 block text-sm text-mocha">{m.hint}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'cash' && (
            <div className="space-y-3">
              <label className="label" htmlFor="received">Amount received (RM)</label>
              <input id="received" className="input text-right text-2xl font-bold" inputMode="decimal" value={amount}
                onChange={(e) => /^\d{0,6}(\.\d{0,2})?$/.test(e.target.value) && setAmount(e.target.value)} placeholder="0.00" autoFocus />
              <div className="grid max-w-xs grid-cols-3 gap-2">
                {KEYS.map((k) => <button key={k} className="btn-ghost py-3 text-lg" onClick={() => press(k)} aria-label={k === '⌫' ? 'Backspace' : k}>{k}</button>)}
              </div>
              <button className="btn-ghost" onClick={() => setAmount(totals.total.toFixed(2))}>Exact amount</button>
              <p className="text-lg">Change: <strong className={cashOk ? 'text-sage' : 'text-mocha'}>{cashOk ? money(changeCents / 100) : 'RM 0.00'}</strong></p>
              {amount !== '' && !cashOk && <p className="text-sm text-brick">Amount is less than the total.</p>}
            </div>
          )}

          {(step === 'card' || step === 'qr') && (
            <div className="space-y-4">
              {step === 'card' ? (
                <p className="rounded-xl bg-crema p-4 text-sm">Ask the customer to pay on the <strong>card terminal</strong>. Never ask for or type card details here.</p>
              ) : (
                <div className="rounded-xl bg-crema p-4 text-center text-sm">
                  <div className="mx-auto mb-3 grid h-40 w-40 place-items-center rounded-lg border-2 border-dashed border-mocha/50 text-mocha">QR placeholder</div>
                  No e-wallet provider is connected yet, so this is not a real QR code.
                </div>
              )}
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>{step === 'card' ? 'The terminal shows the payment was approved.' : 'I have seen the payment arrive in the shop e-wallet.'}</span>
              </label>
              <p className="text-xs text-mocha">This is saved as a manual confirmation. The app does not check the payment itself.</p>
            </div>
          )}

          {error && <div className="mt-3"><ErrorBox message={error} /></div>}

          <div className="mt-5 flex justify-between">
            <button className="btn-ghost" disabled={busy} onClick={() => (step === 'method' ? onClose() : (setStep('method'), setError('')))}>Back</button>
            {step !== 'method' && (
              <button className="btn-primary" onClick={checkout} disabled={busy || (step === 'cash' ? !cashOk : !confirmed)}>
                {busy ? 'Saving…' : 'Check Out'}
              </button>
            )}
          </div>
        </div>
        <Summary cart={cart} totals={totals} taxRate={taxRate} />
      </div>
    </Modal>
  );
}

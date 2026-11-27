import { useState } from 'react';
import { api } from '../api.js';
import { ErrorBox, Modal } from './ui.jsx';

export const advanceLabel = (next) => (next === 'Preparing' ? 'Start preparing' : next === 'Ready to Serve' ? 'Mark Ready to Serve' : next === 'Finished' ? 'Mark as Finished' : '');
export const isActive = (o) => o.status === 'New Order' || o.status === 'Preparing';

export const advanceOrder = (order) => api(`/orders/${order.id}/advance`, { method: 'POST', body: { from: order.status } });

export function CancelModal({ order, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/orders/${order.id}/cancel`, { method: 'POST', body: { reason } });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={`Cancel ${order.invoice}?`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm">The order moves to History as Cancelled and does not count as a sale.</p>
        <label className="label" htmlFor="reason">Reason</label>
        <input id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} autoFocus required />
        <ErrorBox message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Back</button>
          <button className="btn-danger" disabled={busy || reason.trim().length < 3}>{busy ? 'Cancelling…' : 'Cancel order'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function EditModal({ order, onClose, onDone }) {
  const [customerName, setCustomerName] = useState(order.customerName || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/orders/${order.id}`, { method: 'PATCH', body: { customerName, notes } });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={`Edit ${order.invoice}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="label" htmlFor="cn">Customer name</label>
        <input id="cn" className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={100} />
        <label className="label" htmlFor="nt">Notes</label>
        <textarea id="nt" className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        <p className="text-xs text-mocha">Items and prices cannot be changed after payment. Cancel the order and make a new one instead.</p>
        <ErrorBox message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Back</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

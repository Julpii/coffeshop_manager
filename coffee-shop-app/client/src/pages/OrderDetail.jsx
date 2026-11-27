import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '../api.js';
import { dateTime, money } from '../format.js';
import { ErrorBox, PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';
import { CancelModal, EditModal, advanceLabel, advanceOrder, isActive } from '../components/OrderActions.jsx';

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 border-b border-latte/60 py-2 text-sm last:border-0">
    <dt className="text-mocha">{label}</dt><dd className="text-right font-medium">{children}</dd>
  </div>
);

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: o, loading, error, reload } = useFetch(`/orders/${id}`);
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading && !o) return <Spinner />;
  if (error && !o) return <ErrorBox message={error} onRetry={reload} />;

  async function advance() {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try { await advanceOrder(o); } catch (e) { setActionError(e.message); }
    await reload();
    setBusy(false);
  }

  return (
    <div>
      <PageHeader title={o.invoice} subtitle={`Order #${o.orderNo}`}>
        <button className="btn-ghost" onClick={() => navigate(-1)}>Back</button>
        {isActive(o) && (
          <>
            <button className="btn-ghost" onClick={() => setModal('edit')}>Edit Order</button>
            <button className="btn-danger" onClick={() => setModal('cancel')}>Cancel Order</button>
            <button className="btn-primary" disabled={busy} onClick={advance}>{advanceLabel(o.nextStatus)}</button>
          </>
        )}
      </PageHeader>
      <ErrorBox message={actionError} />
      <div className="mt-3 grid gap-5 lg:grid-cols-[340px_1fr]">
        <dl className="panel h-fit p-4">
          <Row label="Customer">{o.customerName || 'Walk-in'}</Row>
          <Row label="Invoice">{o.invoice}</Row>
          <Row label="Order number">{o.orderNo}</Row>
          <Row label="Dining method">{o.diningMethod}</Row>
          <Row label="Order time">{dateTime(o.createdAt)}</Row>
          <Row label="Status"><StatusBadge status={o.status} /></Row>
          <Row label="Payment">{o.paymentMethod}{o.paymentMode === 'manual_confirmation' ? ' (confirmed manually)' : ''}</Row>
          {o.cancelReason && <Row label="Cancel reason">{o.cancelReason}</Row>}
          {o.createdBy && <Row label="Taken by">{o.createdBy}</Row>}
        </dl>
        <section className="space-y-4">
          <div className="panel overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-latte"><tr><th className="th">Menu</th><th className="th text-right">Qty</th><th className="th text-right">Price</th></tr></thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id} className="border-b border-latte/60"><td className="td">{i.name}</td><td className="td text-right">{i.quantity}</td><td className="td text-right">{money(i.lineTotal)}</td></tr>
                ))}
              </tbody>
              <tfoot className="text-sm">
                <tr><td className="td" colSpan={2}>Subtotal</td><td className="td text-right">{money(o.subtotal)}</td></tr>
                {o.taxRate > 0 && <tr><td className="td" colSpan={2}>Tax ({o.taxRate}%)</td><td className="td text-right">{money(o.taxAmount)}</td></tr>}
                <tr className="font-bold text-espresso"><td className="td" colSpan={2}>Total</td><td className="td text-right">{money(o.total)}</td></tr>
                {o.paymentMethod === 'Cash' && <>
                  <tr><td className="td" colSpan={2}>Cash received</td><td className="td text-right">{money(o.amountReceived)}</td></tr>
                  <tr><td className="td" colSpan={2}>Change</td><td className="td text-right">{money(o.changeGiven)}</td></tr>
                </>}
              </tfoot>
            </table>
          </div>
          <div className="panel p-4 text-sm"><h2 className="mb-1 text-base font-bold">Notes</h2>{o.notes || <span className="text-mocha">No notes.</span>}</div>
        </section>
      </div>
      {modal === 'cancel' && <CancelModal order={o} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal === 'edit' && <EditModal order={o} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
    </div>
  );
}

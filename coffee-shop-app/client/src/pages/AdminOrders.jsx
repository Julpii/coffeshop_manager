import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../api.js';
import { timeOnly } from '../format.js';
import { Empty, ErrorBox, PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';
import { CancelModal, advanceLabel, advanceOrder } from '../components/OrderActions.jsx';

const FILTERS = [['', 'All'], ['Preparing', 'Preparing'], ['New Order', 'New Orders'], ['Ready to Serve', 'Ready']];

export default function AdminOrders() {
  const { data, loading, error, reload, reloadQuiet } = useFetch('/orders/active', { pollMs: 10000 });
  const [filter, setFilter] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const orders = (data || []).filter((o) => !filter || o.status === filter);

  async function advance(o) {
    if (busyId || !o.nextStatus) return; // ignore clicks while a change is being saved
    setBusyId(o.id);
    setActionError('');
    try { await advanceOrder(o); } catch (e) { setActionError(e.message); }
    await reloadQuiet();
    setBusyId(null);
  }

  return (
    <div>
      <PageHeader title="Orders" subtitle="Double-click a card, or use its button, to move it to the next step.">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter orders">
          {FILTERS.map(([value, label]) => (
            <button key={label} aria-pressed={filter === value} onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${filter === value ? 'bg-espresso text-foam' : 'border border-latte bg-white hover:bg-crema'}`}>{label}</button>
          ))}
        </div>
      </PageHeader>
      <div className="mb-3 space-y-2"><ErrorBox message={error} onRetry={reload} /><ErrorBox message={actionError} /></div>

      {loading && !data ? <Spinner /> : orders.length === 0 ? <div className="panel"><Empty>No orders to show.</Empty></div> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => (
            <article key={o.id} onDoubleClick={() => advance(o)}
              className={`panel flex select-none flex-col gap-3 p-4 ${busyId === o.id ? 'opacity-60' : ''}`}>
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold">Order #{o.orderNo}</h2>
                  <p className="text-sm text-mocha">{o.diningMethod} · {timeOnly(o.createdAt)}</p>
                </div>
                <StatusBadge status={o.status} />
              </header>
              <p className="text-sm font-medium text-espresso">{o.customerName || 'Walk-in'}</p>
              <ul className="space-y-1 text-sm">
                {o.items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.name}</span><span className="font-semibold">×{i.quantity}</span></li>)}
              </ul>
              {o.notes && <p className="rounded-lg bg-crema p-2 text-sm"><strong>Note:</strong> {o.notes}</p>}
              <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-latte pt-3" onDoubleClick={(e) => e.stopPropagation()}>
                {o.nextStatus
                  ? <button className="btn-primary" disabled={busyId === o.id} onClick={() => advance(o)}>{advanceLabel(o.nextStatus)}</button>
                   : <span className="text-sm font-semibold text-sage">Order finished</span>}
                 {(o.status === 'New Order' || o.status === 'Preparing') && <button className="btn-ghost text-brick" onClick={() => setCancelling(o)}>Cancel</button>}
                <Link className="ml-auto text-sm font-medium text-caramel-dark underline" to={`/orders/${o.id}`}>Details</Link>
              </footer>
            </article>
          ))}
        </div>
      )}
      {cancelling && <CancelModal order={cancelling} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); reload(); }} />}
    </div>
  );
}

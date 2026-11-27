import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDebounced, useFetch } from '../api.js';
import { dateTime, itemsSummary, money } from '../format.js';
import { Empty, ErrorBox, PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';
import { CancelModal, EditModal, advanceLabel, advanceOrder, isActive } from '../components/OrderActions.jsx';

export default function CashierOrders() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const q = useDebounced(search);
  const { data, loading, error, reload, reloadQuiet } = useFetch(
    `/orders/active?search=${encodeURIComponent(q)}&status=${status}&date=${date}`, { pollMs: 15000 });
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null); // 'edit' | 'cancel'
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = data?.find((o) => o.id === selectedId);

  async function advance() {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try { await advanceOrder(selected); reloadQuiet(); } catch (e) { setActionError(e.message); reloadQuiet(); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Orders" subtitle="Orders that are not finished yet." />
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" type="search" placeholder="Search invoice or customer" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        <input className="input w-auto" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option>New Order</option><option>Preparing</option><option>Ready to Serve</option>
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className="btn-ghost" disabled={!selected || !isActive(selected)} onClick={() => setModal('edit')}>Edit Order</button>
        <button className="btn-danger" disabled={!selected || !isActive(selected)} onClick={() => setModal('cancel')}>Cancel Order</button>
        <button className="btn-primary" disabled={!selected || !selected.nextStatus || busy} onClick={advance}>
          {selected?.nextStatus ? advanceLabel(selected.nextStatus) : 'Next step'}
        </button>
        {selected && <Link className="btn-ghost" to={`/orders/${selected.id}`}>Details</Link>}
        {!selected && <span className="text-sm text-mocha">Select an order to act on it.</span>}
      </div>
      <div className="mb-3 space-y-2"><ErrorBox message={error} onRetry={reload} /><ErrorBox message={actionError} /></div>

      <div className="panel overflow-x-auto">
        {loading && !data ? <Spinner /> : data?.length === 0 ? <Empty>No orders right now.</Empty> : (
          <table className="w-full">
            <thead className="border-b border-latte"><tr>
              {['Invoice', 'No.', 'Time', 'Customer', 'Items', 'Dining', 'Total', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}
            </tr></thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} onClick={() => setSelectedId(o.id)} aria-selected={o.id === selectedId}
                  className={`cursor-pointer border-b border-latte/60 last:border-0 ${o.id === selectedId ? 'bg-caramel-light' : 'hover:bg-crema'}`}>
                  <td className="td font-medium">{o.invoice}</td>
                  <td className="td">{o.orderNo}</td>
                  <td className="td whitespace-nowrap">{dateTime(o.createdAt)}</td>
                  <td className="td">{o.customerName || <span className="text-mocha">Walk-in</span>}</td>
                  <td className="td max-w-xs truncate">{itemsSummary(o)}</td>
                  <td className="td whitespace-nowrap">{o.diningMethod}</td>
                  <td className="td whitespace-nowrap">{money(o.total)}</td>
                  <td className="td"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal === 'cancel' && selected && <CancelModal order={selected} onClose={() => setModal(null)} onDone={() => { setModal(null); setSelectedId(null); reload(); }} />}
      {modal === 'edit' && selected && <EditModal order={selected} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
    </div>
  );
}

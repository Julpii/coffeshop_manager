import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useDebounced, useFetch } from '../api.js';
import { dateTime, itemsSummary } from '../format.js';
import { Empty, ErrorBox, PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);

  useEffect(() => setPage(1), [q, date, status, payment]);

  const { data, loading, error, reload } = useFetch(
    `/orders/history?page=${page}&search=${encodeURIComponent(q)}&date=${date}&status=${status}&payment=${encodeURIComponent(payment)}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader title="History" subtitle="Every order, newest first. Finished orders are view-only." />
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" type="search" placeholder="Search invoice or customer" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        <input className="input w-auto" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option>New Order</option><option>Preparing</option><option>Ready to Serve</option><option>Finished</option><option>Cancelled</option>
        </select>
        <select className="input w-auto" value={payment} onChange={(e) => setPayment(e.target.value)} aria-label="Payment method">
          <option value="">All payments</option>
          <option>Cash</option><option>Card</option><option>E-Wallet/QR</option>
        </select>
      </div>
      <ErrorBox message={error} onRetry={reload} />

      <div className="panel overflow-x-auto">
        {loading && !data ? <Spinner /> : data?.rows.length === 0 ? <Empty>No matching orders.</Empty> : (
          <table className="w-full">
            <thead className="border-b border-latte"><tr>
              {['Invoice', 'Date & time', 'Customer', 'Payment', 'Dining', ...(user.role === 'admin' ? ['Order details'] : []), 'Status'].map((h) => <th key={h} className="th">{h}</th>)}
            </tr></thead>
            <tbody>
              {data?.rows.map((o) => (
                <tr key={o.id} className="cursor-pointer border-b border-latte/60 last:border-0 hover:bg-crema" onClick={() => navigate(`/orders/${o.id}`)}>
                  <td className="td font-medium"><Link className="underline" to={`/orders/${o.id}`} onClick={(e) => e.stopPropagation()}>{o.invoice}</Link></td>
                  <td className="td whitespace-nowrap">{dateTime(o.createdAt)}</td>
                  <td className="td">{o.customerName || <span className="text-mocha">Walk-in</span>}</td>
                  <td className="td whitespace-nowrap">{o.paymentMethod}</td>
                  <td className="td whitespace-nowrap">{o.diningMethod}</td>
                  {user.role === 'admin' && <td className="td max-w-xs truncate">{itemsSummary(o)}</td>}
                  <td className="td"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-mocha">{data.total} order{data.total === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page} of {pages}</span>
            <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

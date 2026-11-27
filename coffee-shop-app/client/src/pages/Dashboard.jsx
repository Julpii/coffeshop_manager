import { useFetch } from '../api.js';
import { useAuth } from '../auth.jsx';
import { dateTime, itemsSummary, money, shortDay } from '../format.js';
import { Empty, ErrorBox, PageHeader, Spinner, StatusBadge } from '../components/ui.jsx';

const Card = ({ label, value }) => (
  <div className="panel p-5">
    <p className="text-sm text-mocha">{label}</p>
    <p className="mt-1 font-display text-3xl font-bold text-espresso">{value}</p>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { data: d, loading, error, reload } = useFetch('/dashboard', { pollMs: 30000 });
  if (loading && !d) return <Spinner />;
  if (error && !d) return <ErrorBox message={error} onRetry={reload} />;

  const max = Math.max(...d.weekly.map((w) => w.sales), 1);
  return (
    <div>
      <PageHeader title={`Welcome, ${user.name}`} subtitle={dateTime(d.now)} />
      <ErrorBox message={error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Today's sales" value={money(d.todaySales)} />
        <Card label="Transactions today" value={d.todayTransactions} />
        <Card label="Pending orders" value={d.pendingOrders} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="panel p-5">
          <h2 className="mb-1 text-lg font-bold">Sales, last 7 days</h2>
          <p className="mb-4 text-xs text-mocha">Cancelled orders are not counted.</p>
          <div className="flex h-48 items-end gap-3" role="img" aria-label={`Daily sales: ${d.weekly.map((w) => `${shortDay(w.date)} ${money(w.sales)}`).join(', ')}`}>
            {d.weekly.map((w) => (
              <div key={w.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs text-mocha">{w.sales > 0 ? Math.round(w.sales) : ''}</span>
                <div className="w-full rounded-t-md bg-caramel" style={{ height: `${(w.sales / max) * 100}%`, minHeight: w.sales > 0 ? 4 : 2, opacity: w.sales > 0 ? 1 : 0.3 }} />
                <span className="text-xs text-mocha">{shortDay(w.date)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 text-lg font-bold">Top sellers this month</h2>
          {d.topProducts.length === 0 ? <Empty>No sales yet this month.</Empty> : (
            <ol className="space-y-2">
              {d.topProducts.map((p) => (
                <li key={p.name} className="flex justify-between text-sm"><span>{p.name}</span><span className="font-semibold">{p.quantity} sold</span></li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="panel mt-5 overflow-x-auto">
        <h2 className="px-5 pt-5 text-lg font-bold">Recent orders</h2>
        {d.recentOrders.length === 0 ? <Empty>No orders yet.</Empty> : (
          <table className="mt-2 w-full">
            <thead className="border-b border-latte"><tr>{['Order', 'Date & time', 'Customer', 'Order details', 'Dining', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {d.recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-latte/60 last:border-0">
                  <td className="td font-medium">{o.invoice}</td>
                  <td className="td whitespace-nowrap">{dateTime(o.createdAt)}</td>
                  <td className="td">{o.customerName || <span className="text-mocha">Walk-in</span>}</td>
                  <td className="td max-w-xs truncate">{itemsSummary(o)}</td>
                  <td className="td whitespace-nowrap">{o.diningMethod}</td>
                  <td className="td"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

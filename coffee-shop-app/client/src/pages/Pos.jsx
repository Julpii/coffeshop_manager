import { useEffect, useMemo, useState } from 'react';
import { useDebounced, useFetch } from '../api.js';
import { money, toCents, dateTime } from '../format.js';
import { Empty, ErrorBox, Spinner } from '../components/ui.jsx';
import PaymentModal from '../components/PaymentModal.jsx';

function ProductTile({ p, onAdd }) {
  return (
    <button onClick={() => onAdd(p)} className="group overflow-hidden rounded-xl border border-latte bg-white text-left transition-colors hover:border-caramel">
      {p.imageUrl
        ? <img src={p.imageUrl} alt="" className="h-28 w-full object-cover" loading="lazy" />
        : <div className="grid h-28 place-items-center bg-crema font-display text-3xl text-mocha/60" aria-hidden="true">{p.name[0]}</div>}
      <div className="p-3">
        <p className="font-semibold text-espresso">{p.name}</p>
        {p.description && <p className="line-clamp-1 text-xs text-mocha">{p.description}</p>}
        <p className="mt-1 text-sm font-bold text-caramel-dark">{money(p.price)}</p>
      </div>
    </button>
  );
}

export default function Pos() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const q = useDebounced(search);
  const products = useFetch(`/products?search=${encodeURIComponent(q)}${categoryId ? `&categoryId=${categoryId}` : ''}`);
  const categories = useFetch('/categories');
  const config = useFetch('/config');
  const taxRate = config.data?.taxRate || 0;

  const [cart, setCart] = useState([]); // [{ product, qty }]
  const [customerName, setCustomerName] = useState('');
  const [diningMethod, setDiningMethod] = useState('Dine In');
  const [notes, setNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const totals = useMemo(() => {
    const subtotalC = cart.reduce((s, l) => s + toCents(l.product.price) * l.qty, 0);
    const taxC = Math.round((subtotalC * taxRate) / 100);
    return { subtotal: subtotalC / 100, tax: taxC / 100, total: (subtotalC + taxC) / 100 };
  }, [cart, taxRate]);

  const add = (p) => setCart((c) => (c.find((l) => l.product.id === p.id)
    ? c.map((l) => (l.product.id === p.id ? { ...l, qty: Math.min(99, l.qty + 1) } : l))
    : [...c, { product: p, qty: 1 }]));
  // Going down to 0 removes the line.
  const change = (id, d) => setCart((c) => c.map((l) => (l.product.id === id ? { ...l, qty: Math.min(99, l.qty + d) } : l)).filter((l) => l.qty > 0));

  function reset() {
    setCart([]); setCustomerName(''); setNotes(''); setDiningMethod('Dine In'); setPaying(false);
  }

  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <section>
        <input className="input mb-3" type="search" placeholder="Search menu" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search menu" />
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Categories">
          {[{ id: '', name: 'All' }, ...(categories.data || [])].map((c) => (
            <button key={c.id} onClick={() => setCategoryId(c.id)} aria-pressed={categoryId === c.id}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${categoryId === c.id ? 'bg-espresso text-foam' : 'border border-latte bg-white hover:bg-crema'}`}>
              {c.name}
            </button>
          ))}
        </div>
        <ErrorBox message={products.error} onRetry={products.reload} />
        {products.loading && !products.data ? <Spinner /> : products.data?.length === 0
          ? <Empty>No products found.</Empty>
          : <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{products.data?.map((p) => <ProductTile key={p.id} p={p} onAdd={add} />)}</div>}
      </section>

      <aside className="panel h-fit space-y-3 p-4 lg:sticky lg:top-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Current order</h2>
          <span className="text-xs text-mocha">{dateTime(`${stamp}:00`)}</span>
        </div>
        <input className="input" placeholder="Customer name (optional)" value={customerName} maxLength={100} onChange={(e) => setCustomerName(e.target.value)} aria-label="Customer name" />
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Dining method">
          {['Dine In', 'Take Away'].map((m) => (
            <button key={m} aria-pressed={diningMethod === m} onClick={() => setDiningMethod(m)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${diningMethod === m ? 'border-espresso bg-espresso text-foam' : 'border-latte bg-white hover:bg-crema'}`}>{m}</button>
          ))}
        </div>

        {cart.length === 0 ? <Empty>Tap a product to add it.</Empty> : (
          <ul className="divide-y divide-latte">
            {cart.map((l) => (
              <li key={l.product.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-espresso">{l.product.name}</p>
                  <p className="text-xs text-mocha">{money(l.product.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="btn-ghost h-8 w-8 !p-0" onClick={() => change(l.product.id, -1)} aria-label={`Remove one ${l.product.name}`}>−</button>
                  <span className="w-6 text-center font-semibold">{l.qty}</span>
                  <button className="btn-ghost h-8 w-8 !p-0" onClick={() => change(l.product.id, 1)} aria-label={`Add one ${l.product.name}`}>+</button>
                </div>
                <span className="w-20 text-right font-medium">{money(l.product.price * l.qty)}</span>
              </li>
            ))}
          </ul>
        )}

        <textarea className="input" rows={2} maxLength={500} placeholder="Notes for the kitchen" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Order notes" />

        <dl className="space-y-1 border-t border-latte pt-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
          {taxRate > 0 && <div className="flex justify-between"><dt>Tax ({taxRate}%)</dt><dd>{money(totals.tax)}</dd></div>}
          <div className="flex justify-between text-lg font-bold text-espresso"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
        </dl>
        <button className="btn-primary w-full py-3" disabled={cart.length === 0} onClick={() => setPaying(true)}>Payment</button>
        {cart.length > 0 && <button className="btn-ghost w-full" onClick={reset}>Clear order</button>}
      </aside>

      {paying && (
        <PaymentModal cart={cart} totals={totals} taxRate={taxRate} order={{ customerName, diningMethod, notes }}
          onClose={() => setPaying(false)} onDone={reset} />
      )}
    </div>
  );
}

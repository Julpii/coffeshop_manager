import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useDebounced, useFetch } from '../api.js';
import { money } from '../format.js';
import { ConfirmDialog, Empty, ErrorBox, PageHeader, Spinner } from '../components/ui.jsx';

export default function Products() {
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const { data, loading, error, reload } = useFetch(`/products?search=${encodeURIComponent(q)}`);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function remove() {
    setBusy(true);
    try {
      await api(`/products/${toDelete.id}`, { method: 'DELETE' });
      setToDelete(null);
      reload();
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Products">
        <input className="input w-64" type="search" placeholder="Search item" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search item" />
        <Link className="btn-primary" to="/products/new">Add Product</Link>
      </PageHeader>
      <ErrorBox message={error} onRetry={reload} />
      <div className="panel mt-3 overflow-x-auto">
        {loading && !data ? <Spinner /> : data?.length === 0 ? <Empty>No products yet.</Empty> : (
          <table className="w-full">
            <thead className="border-b border-latte"><tr>{['Image', 'Code', 'Name', 'Category', 'Price', 'Status', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {data?.map((p) => (
                <tr key={p.id} className="border-b border-latte/60 last:border-0">
                  <td className="td">
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      : <span className="grid h-10 w-10 place-items-center rounded-lg bg-crema font-display text-mocha" aria-hidden="true">{p.name[0]}</span>}
                  </td>
                  <td className="td">{p.code}</td>
                  <td className="td font-medium">{p.name}</td>
                  <td className="td">{p.categoryName || '-'}</td>
                  <td className="td whitespace-nowrap">{money(p.price)}</td>
                  <td className="td capitalize">{p.status}</td>
                  <td className="td whitespace-nowrap">
                    <Link className="btn-ghost mr-2 !px-3 !py-1" to={`/products/${p.id}/edit`}>Edit</Link>
                    <button className="btn-ghost !px-3 !py-1 text-brick" onClick={() => { setDeleteError(''); setToDelete(p); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {toDelete && (
        <ConfirmDialog title="Delete product" message={`Are you sure you want to delete "${toDelete.name}"? Past orders keep their records.`}
          busy={busy} error={deleteError} onConfirm={remove} onCancel={() => setToDelete(null)} />
      )}
    </div>
  );
}

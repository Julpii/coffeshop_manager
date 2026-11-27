import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useFetch } from '../api.js';
import { ConfirmDialog, Empty, ErrorBox, PageHeader, Spinner } from '../components/ui.jsx';

export default function Categories() {
  const { data, loading, error, reload } = useFetch('/categories');
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function remove() {
    setBusy(true);
    try {
      await api(`/categories/${toDelete.id}`, { method: 'DELETE' });
      setToDelete(null);
      reload();
    } catch (e) {
      setDeleteError(e.message); // e.g. "This category still has 4 product(s)"
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Category"><Link className="btn-primary" to="/categories/new">Add Category</Link></PageHeader>
      <ErrorBox message={error} onRetry={reload} />
      <div className="panel mt-3 overflow-x-auto">
        {loading && !data ? <Spinner /> : data?.length === 0 ? <Empty>No categories yet.</Empty> : (
          <table className="w-full">
            <thead className="border-b border-latte"><tr>{['Category name', 'Products', 'Actions'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {data?.map((c) => (
                <tr key={c.id} className="border-b border-latte/60 last:border-0">
                  <td className="td font-medium">{c.name}</td>
                  <td className="td">{c.productCount}</td>
                  <td className="td whitespace-nowrap">
                    <Link className="btn-ghost mr-2 !px-3 !py-1" to={`/categories/${c.id}/edit`}>Edit</Link>
                    <button className="btn-ghost !px-3 !py-1 text-brick" onClick={() => { setDeleteError(''); setToDelete(c); }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {toDelete && (
        <ConfirmDialog title="Delete category" message={`Are you sure you want to delete "${toDelete.name}"?`}
          busy={busy} error={deleteError} onConfirm={remove} onCancel={() => setToDelete(null)} />
      )}
    </div>
  );
}

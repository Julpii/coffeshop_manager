import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, useFetch } from '../api.js';
import { ErrorBox, Field, PageHeader } from '../components/ui.jsx';

export default function CategoryForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const list = useFetch('/categories');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing && list.data) setName(list.data.find((c) => String(c.id) === id)?.name || '');
  }, [list.data, editing, id]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(editing ? `/categories/${id}` : '/categories', { method: editing ? 'PUT' : 'POST', body: { name } });
      navigate('/categories');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md">
      <PageHeader title={editing ? 'Edit category' : 'Add category'} />
      <form onSubmit={submit} className="panel space-y-4 p-5">
        <ErrorBox message={error} />
        <Field label="Category name" htmlFor="cname">
          <input id="cname" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
        </Field>
        <div className="flex justify-between">
          <button type="button" className="btn-ghost" onClick={() => navigate('/categories')}>Back</button>
          <button className="btn-primary" disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

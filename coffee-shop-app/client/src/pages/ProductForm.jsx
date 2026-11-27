import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, useFetch } from '../api.js';
import { ErrorBox, Field, PageHeader, Spinner } from '../components/ui.jsx';

export default function ProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const categories = useFetch('/categories');
  const existing = useFetch(editing ? `/products/${id}` : null);

  const [form, setForm] = useState({ code: '', name: '', categoryId: '', price: '', status: 'active', description: '' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = existing.data;
    if (editing && p?.id) {
      setForm({ code: p.code, name: p.name, categoryId: String(p.categoryId || ''), price: String(p.price), status: p.status, description: p.description || '' });
      setPreview(p.imageUrl);
    }
  }, [existing.data, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function pick(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setErrors({ image: 'Use a JPG, PNG or WebP image' });
    if (file.size > 2 * 1024 * 1024) return setErrors({ image: 'Image must be 2 MB or smaller' });
    setErrors({});
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage('');
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    if (image) body.append('image', image);
    try {
      await api(editing ? `/products/${id}` : '/products', { method: editing ? 'PUT' : 'POST', form: body });
      navigate('/products');
    } catch (err) {
      setErrors(err.fields || {});
      setMessage(err.message);
      setBusy(false);
    }
  }

  if (editing && existing.loading && !existing.data) return <Spinner />;
  if (editing && existing.error) return <ErrorBox message={existing.error} />;

  const cls = (k) => `input ${errors[k] ? 'input-error' : ''}`;
  return (
    <div className="max-w-2xl">
      <PageHeader title={editing ? 'Edit product' : 'Add product'} />
      <form onSubmit={submit} className="panel space-y-4 p-5" noValidate>
        <ErrorBox message={message} />
        <Field label="Image" error={errors.image} htmlFor="image">
          <div className="flex items-center gap-4">
            {preview ? <img src={preview} alt="Preview" className="h-20 w-20 rounded-lg object-cover" />
              : <div className="grid h-20 w-20 place-items-center rounded-lg bg-crema text-xs text-mocha">No image</div>}
            <input id="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="text-sm" />
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product code" error={errors.code} htmlFor="code"><input id="code" className={cls('code')} value={form.code} onChange={set('code')} maxLength={30} /></Field>
          <Field label="Product name" error={errors.name} htmlFor="name"><input id="name" className={cls('name')} value={form.name} onChange={set('name')} maxLength={120} /></Field>
          <Field label="Category" error={errors.categoryId} htmlFor="category">
            <select id="category" className={cls('categoryId')} value={form.categoryId} onChange={set('categoryId')}>
              <option value="">Choose…</option>
              {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Price (RM)" error={errors.price} htmlFor="price"><input id="price" className={cls('price')} inputMode="decimal" value={form.price} onChange={set('price')} /></Field>
          <Field label="Status" htmlFor="status">
            <select id="status" className="input" value={form.status} onChange={set('status')}>
              <option value="active">Active (can be ordered)</option><option value="inactive">Inactive (hidden from cashier)</option>
            </select>
          </Field>
        </div>
        <Field label="Description" error={errors.description} htmlFor="description">
          <textarea id="description" className="input" rows={2} maxLength={255} value={form.description} onChange={set('description')} />
        </Field>
        <div className="flex justify-between pt-2">
          <button type="button" className="btn-ghost" onClick={() => navigate('/products')}>Back</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

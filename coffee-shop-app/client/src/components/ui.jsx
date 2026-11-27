import { useEffect, useRef } from 'react';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-mocha" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-latte border-t-caramel" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-brick/30 bg-brick-light px-4 py-3 text-sm text-brick" role="alert">
      <span>{message}</span>
      {onRetry && <button className="font-semibold underline" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="px-4 py-10 text-center text-sm text-mocha">{children}</div>;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-mocha">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const STATUS_STYLE = {
  'New Order': 'bg-caramel-light text-caramel-dark',
  Preparing: 'bg-latte text-roast',
  'Ready to Serve': 'bg-sage-light text-sage',
  Finished: 'bg-espresso text-foam',  
  Cancelled: 'bg-brick-light text-brick',
};
export function StatusBadge({ status }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>{status}</span>;
}

/** Centered dialog. Esc closes it. Click on the dark area closes it too. */
export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-espresso/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-foam p-6 shadow-xl ${wide ? 'max-w-4xl' : 'max-w-md'}`}>
        {title && <h2 className="mb-4 text-xl font-bold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'Confirm', busy, error, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-4 text-sm">{message}</p>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>Back</button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function Field({ label, error, children, htmlFor }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-brick">{error}</p>}
    </div>
  );
}

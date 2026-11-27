import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Field } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(username, password);
      navigate(user.role === 'admin' ? '/dashboard' : '/pos', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-espresso p-10 text-foam md:flex">
        <p className="font-display text-xl">Coffee Shop</p>
        <div>
          <h1 className="font-display text-5xl font-bold leading-tight text-foam">Fresh orders,<br />served right.</h1>
          <p className="mt-4 max-w-sm text-latte">Take orders, track the counter and see how the day is going.</p>
        </div>
        <p className="text-sm text-latte/70">Staff sign-in only</p>
      </div>
      <div className="grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="text-3xl font-bold">Sign in</h2>
            <p className="text-sm text-mocha">Use the account your manager gave you.</p>
          </div>
          <ErrorBox message={error} />
          <Field label="Username" htmlFor="username">
            <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
          </Field>
          <Field label="Password" htmlFor="password">
            <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </Field>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Enter'}</button>
        </form>
      </div>
    </div>
  );
}

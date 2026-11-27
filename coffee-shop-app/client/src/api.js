import { useCallback, useEffect, useRef, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'coffee_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

/** api('/orders', { method: 'POST', body: {...} }) or { form: FormData } for file uploads. */
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError('Cannot reach the server. Is it running?', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('auth:expired'));
    throw new ApiError(data.error || 'Something went wrong', res.status, data.fields);
  }
  return data;
}

/** Loads data from the API. Returns { data, loading, error, reload }. Optional polling. */
export function useFetch(path, { pollMs } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const latest = useRef(0);

  const load = useCallback(async (silent) => {
    if (!path) return setState({ data: null, loading: false, error: null }); // path = null means "do not load"
    const id = ++latest.current;
    if (!silent) setState((s) => ({ ...s, loading: true }));
    try {
      const data = await api(path);
      if (id === latest.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (id === latest.current) setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  }, [path]);

  useEffect(() => {
    load(false);
    if (!pollMs) return undefined;
    const timer = setInterval(() => load(true), pollMs);
    return () => clearInterval(timer);
  }, [load, pollMs]);

  return { ...state, reload: () => load(false), reloadQuiet: () => load(true) };
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

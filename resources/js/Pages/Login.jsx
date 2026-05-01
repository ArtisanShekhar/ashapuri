import { useState } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/login', form);
            localStorage.setItem('ashapuri_token', res.data.token);
            localStorage.setItem('ashapuri_user', JSON.stringify(res.data.user));
            window.location.href = '/dashboard';
        } catch {
            setError('Invalid login details. Please check email/password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <form onSubmit={submit} className="w-full max-w-md ash-panel rounded-2xl p-6 space-y-4">
                <h1 className="text-2xl font-bold text-orange-900">Ashapuri Village Login</h1>
                <p className="text-sm text-gray-700">Sign in by role to access dashboard and data entry forms.</p>

                <label className="block text-sm">
                    Email
                    <input className="w-full mt-1 border rounded-lg px-3 py-2" type="email" required value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
                </label>

                <label className="block text-sm">
                    Password
                    <input className="w-full mt-1 border rounded-lg px-3 py-2" type="password" required value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
                </label>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button disabled={loading} className="w-full ash-button rounded-lg px-3 py-2 disabled:opacity-40">
                    {loading ? 'Logging in...' : 'Login'}
                </button>

                <div className="text-xs text-gray-600 bg-gray-50 border rounded-lg p-3 space-y-1">
                    <p className="font-semibold">Demo users</p>
                    <p>GM: gm@ashapurivillage.in / password123</p>
                    <p>Store: store@ashapurivillage.in / password123</p>
                    <p>Kitchen: kitchen@ashapurivillage.in / password123</p>
                </div>
            </form>
        </main>
    );
}

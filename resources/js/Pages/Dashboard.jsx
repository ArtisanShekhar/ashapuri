import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';

const api = axios.create({ baseURL: '/api' });

export default function Dashboard() {
    const [token] = useState(localStorage.getItem('ashapuri_token') || '');
    const [user] = useState(() => {
        const raw = localStorage.getItem('ashapuri_user');
        return raw ? JSON.parse(raw) : null;
    });
    const [kpi, setKpi] = useState(null);
    const [guestTrend, setGuestTrend] = useState([]);
    const [wasteTrend, setWasteTrend] = useState([]);
    const [costTrend, setCostTrend] = useState([]);
    const [vendorRows, setVendorRows] = useState([]);
    const [priceAlerts, setPriceAlerts] = useState([]);
    const [aiDailySummary, setAiDailySummary] = useState('');
    const [question, setQuestion] = useState('');
    const [aiAnswer, setAiAnswer] = useState('');
    const [view, setView] = useState('dashboard');
    const [period, setPeriod] = useState('month');
    const [status, setStatus] = useState('');
    const [storeForm, setStoreForm] = useState({
        date: '', vendor_name: '', item_name: '', item_category: 'Vegetables', quantity: '', unit: 'kg', cost_per_unit: '', market_rate: '', notes: '', issued_to_kitchen_qty: '',
    });
    const [kitchenForm, setKitchenForm] = useState({
        date: '', meal_type: 'breakfast', submitted_by: user?.name || '', expected_guests: '', temperature_check_passed: true, dishes_ran_out: '', dishes_leftover: '',
        portion_observation: 'Reasonable', actual_guests: '', biggest_waste_dish: '', staff_meals_count: '', staff_meals_qty: '', quality_issues: '', went_well: '', change_tomorrow: '',
    });
    const [dishRows, setDishRows] = useState([{ dish_name: '', quantity_prepped_kg: '', quantity_line_leftover_kg: '', quantity_plate_waste_kg: '', waste_reason: 'Over-prep' }]);

    const canAsk = useMemo(() => token && question.trim().length > 0, [token, question]);
    const canStore = user?.role === 'Store' || user?.role === 'Admin/GM';
    const canKitchen = user?.role === 'Kitchen' || user?.role === 'Admin/GM';

    useEffect(() => {
        if (!token || !user) window.location.href = '/';
    }, [token, user]);

    const headers = { Authorization: `Bearer ${token}` };
    const refresh = async () => {
        try {
            const [s, g, w, c, v, alerts] = await Promise.all([
                api.get('/dashboard/summary', { headers }),
                api.get('/dashboard/guests', { headers }),
                api.get('/dashboard/waste', { headers }),
                api.get('/dashboard/cost-per-cover', { headers }),
                api.get('/store/vendor-analysis', { headers }),
                api.get('/store/price-alerts', { headers }),
            ]);
            setKpi(s.data); setGuestTrend(g.data); setWasteTrend(w.data); setCostTrend(c.data); setVendorRows(v.data || []); setPriceAlerts(alerts.data || []);
            const summary = await api.post('/ai/daily-summary', {}, { headers });
            setAiDailySummary(summary.data.response || '');
        } catch {
            setStatus('Unable to load dashboard data.');
        }
    };

    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [token]);

    const askAi = async () => {
        if (!canAsk) return;
        const res = await api.post('/ai/chat', { message: question }, { headers });
        setAiAnswer(res.data.response);
    };

    const logout = () => {
        localStorage.removeItem('ashapuri_token');
        localStorage.removeItem('ashapuri_user');
        window.location.href = '/';
    };

    const submitStore = async (e) => {
        e.preventDefault();
        await api.post('/store/purchases', normalizeStoreForm(storeForm), { headers });
        setStatus('Store entry submitted.');
        refresh();
    };

    const submitKitchen = async (e) => {
        e.preventDefault();
        const payload = {
            ...normalizeKitchenForm(kitchenForm),
            dish_waste_rows: dishRows.map((row) => ({
                ...row,
                quantity_prepped_kg: Number(row.quantity_prepped_kg || 0),
                quantity_line_leftover_kg: Number(row.quantity_line_leftover_kg || 0),
                quantity_plate_waste_kg: Number(row.quantity_plate_waste_kg || 0),
                calculated_waste_cost: 0,
            })),
        };
        await api.post('/kitchen/submissions', payload, { headers });
        setStatus('Kitchen entry submitted.');
        refresh();
    };

    return (
        <main className="min-h-screen p-2 md:p-4">
            <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-[210px_1fr] gap-3">
                <aside className="ash-panel rounded-xl p-3 h-fit sticky top-3">
                    <h2 className="text-lg font-bold text-black">Ashapuri</h2>
                    <p className="text-[10px] tracking-wide uppercase text-gray-500 mb-4">Operations</p>
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">Departments</p>
                    {['Kitchen', 'Store', 'Housekeeping', 'Laundry', 'Maintenance'].map((it) => (
                        <button key={it} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-orange-50">{it}</button>
                    ))}
                    <p className="text-[11px] font-semibold text-gray-500 mt-4 mb-1">System</p>
                    <button className={`w-full text-left text-sm px-2 py-1.5 rounded ${view === 'dashboard' ? 'bg-black text-white' : 'hover:bg-orange-50'}`} onClick={() => setView('dashboard')}>Dashboard</button>
                    {canStore && <button className={`w-full text-left text-sm px-2 py-1.5 rounded ${view === 'store-form' ? 'bg-black text-white' : 'hover:bg-orange-50'}`} onClick={() => setView('store-form')}>Submit Store Form</button>}
                    {canKitchen && <button className={`w-full text-left text-sm px-2 py-1.5 rounded ${view === 'kitchen-form' ? 'bg-black text-white' : 'hover:bg-orange-50'}`} onClick={() => setView('kitchen-form')}>Submit Kitchen Form</button>}
                    <button className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-orange-50" onClick={logout}>Logout</button>
                </aside>

                <section className="space-y-2.5">
                    <div className="ash-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight">Kitchen Dashboard</h1>
                            <p className="text-xs text-gray-500">{new Date().toDateString()} · Manali · {user?.role}</p>
                        </div>
                        <div className="flex gap-2">
                            {['today', 'week', 'month', '6m', 'year'].map((p) => (
                                <button key={p} onClick={() => setPeriod(p)} className={`px-2.5 py-1 text-[11px] rounded-md border ${period === p ? 'bg-black text-white' : 'bg-white'}`}>{p}</button>
                            ))}
                            <button className="px-2.5 py-1 text-[11px] rounded-md border bg-white" onClick={refresh}>Refresh</button>
                        </div>
                    </div>

                    {status && <div className="ash-panel rounded-lg p-2 text-sm">{status}</div>}

                    {view === 'dashboard' && (
                        <>
                            <section className="ash-panel rounded-xl p-3 text-xs">
                                <b>AI</b> Today: {aiDailySummary || 'Generating summary...'}
                            </section>
                            {priceAlerts[0] && <section className="border border-red-200 bg-red-50 rounded-xl p-2 text-xs">ALERT: {priceAlerts[0].message}</section>}

                            <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Kpi title="Guests Served" value={kpi?.guests_served ?? 0} note="Last 30 days" />
                                <Kpi title="Food Waste" value={`${kpi?.food_waste_kg ?? 0} kg`} note={`${kpi?.food_waste_percent ?? 0}% of prep`} />
                                <Kpi title="Cost Per Cover" value={`Rs ${kpi?.cost_per_cover ?? 0}`} note="per guest" />
                            </section>

                            <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                <Chart title="Guest Count Trend" data={guestTrend} dataKey="guests" />
                                <Chart title="Food Waste Trend" data={wasteTrend} dataKey="waste_kg" />
                                <Chart title="Cost Per Cover" data={costTrend} dataKey="cost_per_cover" />
                            </section>

                            <section className="ash-panel rounded-xl p-3">
                                <h3 className="font-semibold mb-2">Vendor Analysis</h3>
                                <div className="overflow-auto">
                                    <table className="themed-table min-w-[860px]">
                                        <thead><tr><th>Item</th><th>Used</th><th>Your Cost</th><th>Market</th><th>Overpay/Unit</th><th>Overpay/Mo</th><th>Action</th></tr></thead>
                                        <tbody>{vendorRows.map((r, i) => <tr key={i}><td>{r.item}</td><td>{r.qty_used}</td><td>Rs {r.cost_per_unit}</td><td>Rs {r.market_rate}</td><td>Rs {r.overpay_per_unit}</td><td>Rs {r.monthly_loss}</td><td>{r.action}</td></tr>)}</tbody>
                                    </table>
                                </div>
                            </section>

                            {user?.role === 'Admin/GM' && (
                                <section className="ash-panel rounded-xl p-3 space-y-2">
                                    <h3 className="font-semibold">Ask the AI</h3>
                                    <textarea rows={2} className="w-full border rounded-lg p-2 text-sm" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask anything about kitchen, waste, vendors..." />
                                    <button className="ash-button px-4 py-2 rounded-lg disabled:opacity-40" disabled={!canAsk} onClick={askAi}>Send</button>
                                    <div className="text-sm bg-white rounded border p-2 whitespace-pre-wrap">{aiAnswer}</div>
                                </section>
                            )}
                        </>
                    )}

                    {view === 'store-form' && canStore && <StoreForm storeForm={storeForm} setStoreForm={setStoreForm} submitStore={submitStore} />}
                    {view === 'kitchen-form' && canKitchen && <KitchenForm kitchenForm={kitchenForm} setKitchenForm={setKitchenForm} dishRows={dishRows} setDishRows={setDishRows} submitKitchen={submitKitchen} />}
                </section>
            </div>
        </main>
    );
}

function Kpi({ title, value, note }) {
    return <div className="ash-panel rounded-xl p-4"><p className="text-[10px] text-gray-500 uppercase tracking-wide">{title}</p><p className="text-3xl font-semibold text-black mt-1">{value}</p><p className="text-[11px] text-gray-500 mt-1">{note}</p></div>;
}

function Chart({ title, data, dataKey }) {
    return (
        <div className="ash-panel rounded-xl p-3 h-64">
            <p className="font-semibold mb-2">{title}</p>
            <ResponsiveContainer width="100%" height="88%">
                {dataKey === 'waste_kg' ? (
                    <BarChart data={data}><XAxis dataKey="date" /><YAxis /><Tooltip /><Bar dataKey={dataKey} fill="#101010" /></BarChart>
                ) : (
                    <LineChart data={data}><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey={dataKey} stroke="#b84912" strokeWidth={2} dot={false} /></LineChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}

function StoreForm({ storeForm, setStoreForm, submitStore }) {
    return (
        <form onSubmit={submitStore} className="ash-panel rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Store / Procurement Form</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="Date of purchase" type="date" value={storeForm.date} onChange={(v) => setStoreForm((s) => ({ ...s, date: v }))} required />
                <Input label="Vendor name" value={storeForm.vendor_name} onChange={(v) => setStoreForm((s) => ({ ...s, vendor_name: v }))} required />
                <Input label="Item name" value={storeForm.item_name} onChange={(v) => setStoreForm((s) => ({ ...s, item_name: v }))} required />
                <Select label="Item category" value={storeForm.item_category} onChange={(v) => setStoreForm((s) => ({ ...s, item_category: v }))} options={['Vegetables', 'Meat', 'Dairy', 'Pantry', 'Beverages']} />
                <Input label="Quantity received" type="number" value={storeForm.quantity} onChange={(v) => setStoreForm((s) => ({ ...s, quantity: v }))} required />
                <Select label="Unit" value={storeForm.unit} onChange={(v) => setStoreForm((s) => ({ ...s, unit: v }))} options={['kg', 'litre', 'packet', 'piece']} />
                <Input label="Cost per unit (Rs)" type="number" value={storeForm.cost_per_unit} onChange={(v) => setStoreForm((s) => ({ ...s, cost_per_unit: v }))} required />
                <Input label="Market rate (Rs)" type="number" value={storeForm.market_rate} onChange={(v) => setStoreForm((s) => ({ ...s, market_rate: v }))} />
                <Input label="Issued to kitchen (qty)" type="number" value={storeForm.issued_to_kitchen_qty} onChange={(v) => setStoreForm((s) => ({ ...s, issued_to_kitchen_qty: v }))} />
            </div>
            <TextArea label="Notes" value={storeForm.notes} onChange={(v) => setStoreForm((s) => ({ ...s, notes: v }))} />
            <button className="ash-button px-4 py-2 rounded-lg">Submit Store Entry</button>
        </form>
    );
}

function KitchenForm({ kitchenForm, setKitchenForm, dishRows, setDishRows, submitKitchen }) {
    return (
        <form onSubmit={submitKitchen} className="ash-panel rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">Kitchen Daily Log Form</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="Date of service" type="date" value={kitchenForm.date} onChange={(v) => setKitchenForm((s) => ({ ...s, date: v }))} required />
                <Select label="Meal type" value={kitchenForm.meal_type} onChange={(v) => setKitchenForm((s) => ({ ...s, meal_type: v }))} options={['breakfast', 'lunch', 'dinner']} />
                <Input label="Submitted by" value={kitchenForm.submitted_by} onChange={(v) => setKitchenForm((s) => ({ ...s, submitted_by: v }))} required />
                <Input label="Expected guest headcount" type="number" value={kitchenForm.expected_guests} onChange={(v) => setKitchenForm((s) => ({ ...s, expected_guests: v }))} required />
                <Select label="Temperature check passed" value={kitchenForm.temperature_check_passed ? 'Yes' : 'No'} onChange={(v) => setKitchenForm((s) => ({ ...s, temperature_check_passed: v === 'Yes' }))} options={['Yes', 'No']} />
                <Input label="Actual final guest count" type="number" value={kitchenForm.actual_guests} onChange={(v) => setKitchenForm((s) => ({ ...s, actual_guests: v }))} required />
            </div>
            <div className="overflow-auto">
                <table className="themed-table min-w-[760px]">
                    <thead><tr><th>Dish Name</th><th>Prepped (kg)</th><th>Line Leftover (kg)</th><th>Plate Waste (kg)</th><th>Reason</th><th></th></tr></thead>
                    <tbody>
                        {dishRows.map((row, idx) => (
                            <tr key={idx}>
                                <td><input className="w-full border rounded p-1" value={row.dish_name} onChange={(e) => updateDish(setDishRows, idx, 'dish_name', e.target.value)} /></td>
                                <td><input className="w-full border rounded p-1" value={row.quantity_prepped_kg} onChange={(e) => updateDish(setDishRows, idx, 'quantity_prepped_kg', e.target.value)} /></td>
                                <td><input className="w-full border rounded p-1" value={row.quantity_line_leftover_kg} onChange={(e) => updateDish(setDishRows, idx, 'quantity_line_leftover_kg', e.target.value)} /></td>
                                <td><input className="w-full border rounded p-1" value={row.quantity_plate_waste_kg} onChange={(e) => updateDish(setDishRows, idx, 'quantity_plate_waste_kg', e.target.value)} /></td>
                                <td><select className="w-full border rounded p-1" value={row.waste_reason} onChange={(e) => updateDish(setDishRows, idx, 'waste_reason', e.target.value)}>{['Over-prep', 'Spoilage', 'Poor cutting', 'Guest plate', 'Theft', 'Other'].map((o) => <option key={o}>{o}</option>)}</select></td>
                                <td><button type="button" className="text-xs border rounded px-2 py-1" onClick={() => setDishRows((rows) => rows.filter((_, i) => i !== idx))}>Remove</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button type="button" className="border rounded px-3 py-1.5" onClick={() => setDishRows((rows) => [...rows, { dish_name: '', quantity_prepped_kg: '', quantity_line_leftover_kg: '', quantity_plate_waste_kg: '', waste_reason: 'Over-prep' }])}>+ Add Dish</button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="Dishes ran out" value={kitchenForm.dishes_ran_out} onChange={(v) => setKitchenForm((s) => ({ ...s, dishes_ran_out: v }))} />
                <Input label="Dishes leftover" value={kitchenForm.dishes_leftover} onChange={(v) => setKitchenForm((s) => ({ ...s, dishes_leftover: v }))} />
                <Select label="Guest portion behavior" value={kitchenForm.portion_observation} onChange={(v) => setKitchenForm((s) => ({ ...s, portion_observation: v }))} options={['Reasonable', 'Piled high', 'Mixed']} />
                <Input label="Biggest waste dish" value={kitchenForm.biggest_waste_dish} onChange={(v) => setKitchenForm((s) => ({ ...s, biggest_waste_dish: v }))} />
                <Input label="Staff meals count" type="number" value={kitchenForm.staff_meals_count} onChange={(v) => setKitchenForm((s) => ({ ...s, staff_meals_count: v }))} />
                <Input label="Staff meals qty" type="number" value={kitchenForm.staff_meals_qty} onChange={(v) => setKitchenForm((s) => ({ ...s, staff_meals_qty: v }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <TextArea label="Quality issues" value={kitchenForm.quality_issues} onChange={(v) => setKitchenForm((s) => ({ ...s, quality_issues: v }))} />
                <TextArea label="What went well today?" value={kitchenForm.went_well} onChange={(v) => setKitchenForm((s) => ({ ...s, went_well: v }))} />
                <TextArea label="Change tomorrow" value={kitchenForm.change_tomorrow} onChange={(v) => setKitchenForm((s) => ({ ...s, change_tomorrow: v }))} />
            </div>
            <button className="ash-button px-4 py-2 rounded-lg">Submit Kitchen Log</button>
        </form>
    );
}

function Input({ label, onChange, required, ...props }) {
    return <label className="block text-sm">{label}{required ? <span className="text-red-500"> *</span> : null}<input {...props} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" onChange={(e) => onChange(e.target.value)} /></label>;
}
function Select({ label, options, onChange, ...props }) {
    return <label className="block text-sm">{label}<select {...props} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm" onChange={(e) => onChange(e.target.value)}>{options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></label>;
}
function TextArea({ label, value, onChange }) {
    return <label className="block text-sm">{label}<textarea className="w-full border rounded-lg px-3 py-2 mt-1 text-sm min-h-24" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function normalizeStoreForm(form) {
    return { ...form, quantity: Number(form.quantity), cost_per_unit: Number(form.cost_per_unit), market_rate: form.market_rate ? Number(form.market_rate) : null, issued_to_kitchen_qty: form.issued_to_kitchen_qty ? Number(form.issued_to_kitchen_qty) : null };
}
function normalizeKitchenForm(form) {
    return { ...form, expected_guests: Number(form.expected_guests), actual_guests: Number(form.actual_guests), staff_meals_count: Number(form.staff_meals_count || 0), staff_meals_qty: Number(form.staff_meals_qty || 0) };
}
function updateDish(setDishRows, idx, key, value) {
    setDishRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
}

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import Swal from 'sweetalert2';

const api = axios.create({ baseURL: '/api' });
const initialStoreForm = {
    date: '', vendor_name: '', item_name: '', item_category: 'Vegetables', quantity: '', unit: 'kg', cost_per_unit: '', market_rate: '', notes: '', issued_to_kitchen_qty: '',
};
const initialKitchenForm = (submittedBy = '') => ({
    date: '', meal_type: 'breakfast', submitted_by: submittedBy, expected_guests: '', temperature_check_passed: true, dishes_ran_out: '', dishes_leftover: '',
    portion_observation: 'Reasonable', actual_guests: '', biggest_waste_dish: '', staff_meals_count: '', staff_meals_qty: '', quality_issues: '', went_well: '', change_tomorrow: '',
});
const initialDishRows = [{ dish_name: '', quantity_prepped_kg: '', quantity_line_leftover_kg: '', quantity_plate_waste_kg: '', waste_reason: 'Over-prep' }];

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
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [kitchenLogs, setKitchenLogs] = useState([]);
    const [storeErrors, setStoreErrors] = useState({});
    const [isStoreSubmitting, setIsStoreSubmitting] = useState(false);
    const [storeForm, setStoreForm] = useState(initialStoreForm);
    const [kitchenForm, setKitchenForm] = useState(initialKitchenForm(user?.name || ''));
    const [dishRows, setDishRows] = useState(initialDishRows);
    const [kitchenErrors, setKitchenErrors] = useState({});
    const [isKitchenSubmitting, setIsKitchenSubmitting] = useState(false);
    const [isKitchenMenuOpen, setIsKitchenMenuOpen] = useState(false);
    const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
    const [editingStoreId, setEditingStoreId] = useState(null);
    const [editingKitchenId, setEditingKitchenId] = useState(null);
    const [storeListRows, setStoreListRows] = useState([]);
    const [storeListMeta, setStoreListMeta] = useState({ page: 1, lastPage: 1, total: 0 });
    const [storeSearch, setStoreSearch] = useState('');
    const [storeSortBy, setStoreSortBy] = useState('date');
    const [storeSortDir, setStoreSortDir] = useState('desc');
    const [isStoreListLoading, setIsStoreListLoading] = useState(false);
    const [kitchenListRows, setKitchenListRows] = useState([]);
    const [kitchenListMeta, setKitchenListMeta] = useState({ page: 1, lastPage: 1, total: 0 });
    const [kitchenSearch, setKitchenSearch] = useState('');
    const [kitchenSortBy, setKitchenSortBy] = useState('date');
    const [kitchenSortDir, setKitchenSortDir] = useState('desc');
    const [isKitchenListLoading, setIsKitchenListLoading] = useState(false);
    const [deletingStoreId, setDeletingStoreId] = useState(null);
    const [deletingKitchenId, setDeletingKitchenId] = useState(null);

    const canAsk = useMemo(() => token && question.trim().length > 0, [token, question]);
    const canStore = user?.role === 'Store' || user?.role === 'Admin/GM';
    const canKitchen = user?.role === 'Kitchen' || user?.role === 'Admin/GM';
    const showPeriodFilters = ['dashboard', 'report-daily', 'report-vendor', 'report-waste'].includes(view);

    useEffect(() => {
        if (!token || !user) window.location.href = '/';
    }, [token, user]);

    const headers = { Authorization: `Bearer ${token}` };
    const showToast = (message, type = 'success') => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((prev) => [...prev, { id, message, type }]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 3500);
    };
    const refresh = async () => {
        setIsRefreshing(true);
        setStatus('');
        try {
            const params = { period };
            const [s, g, w, c, v, alerts] = await Promise.all([
                api.get('/dashboard/summary', { headers, params }),
                api.get('/dashboard/guests', { headers, params }),
                api.get('/dashboard/waste', { headers, params }),
                api.get('/dashboard/cost-per-cover', { headers, params }),
                api.get('/store/vendor-analysis', { headers, params }),
                api.get('/store/price-alerts', { headers }),
            ]);
            setKpi(s.data); setGuestTrend(g.data); setWasteTrend(w.data); setCostTrend(c.data); setVendorRows(v.data || []); setPriceAlerts(alerts.data || []);
            const kitchen = await api.get('/kitchen/submissions', { headers });
            setKitchenLogs(kitchen.data?.data || []);
            const summary = await api.post('/ai/daily-summary', {}, { headers });
            setAiDailySummary(summary.data.response || '');
            setLastUpdated(new Date().toLocaleString());
        } catch {
            setStatus('Unable to load dashboard data.');
        } finally {
            setIsRefreshing(false);
        }
    };
    const fetchStoreList = async (page = storeListMeta.page) => {
        setIsStoreListLoading(true);
        try {
            const res = await api.get('/store/purchases', {
                headers,
                params: { page, per_page: 10, q: storeSearch, sort_by: storeSortBy, sort_dir: storeSortDir },
            });
            setStoreListRows(res.data?.data || []);
            setStoreListMeta({
                page: res.data?.current_page || 1,
                lastPage: res.data?.last_page || 1,
                total: res.data?.total || 0,
            });
        } catch {
            showToast('Unable to load Store list.', 'error');
        } finally {
            setIsStoreListLoading(false);
        }
    };
    const fetchKitchenList = async (page = kitchenListMeta.page) => {
        setIsKitchenListLoading(true);
        try {
            const res = await api.get('/kitchen/submissions', {
                headers,
                params: { page, per_page: 10, q: kitchenSearch, sort_by: kitchenSortBy, sort_dir: kitchenSortDir },
            });
            setKitchenListRows(res.data?.data || []);
            setKitchenListMeta({
                page: res.data?.current_page || 1,
                lastPage: res.data?.last_page || 1,
                total: res.data?.total || 0,
            });
        } catch {
            showToast('Unable to load Kitchen list.', 'error');
        } finally {
            setIsKitchenListLoading(false);
        }
    };

    useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [token]);
    useEffect(() => { if (token) refresh(); /* eslint-disable-next-line */ }, [period]);
    useEffect(() => {
        if (token && canStore && view === 'store-list') fetchStoreList(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, token, canStore, storeSearch, storeSortBy, storeSortDir]);
    useEffect(() => {
        if (token && canKitchen && view === 'kitchen-list') fetchKitchenList(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, token, canKitchen, kitchenSearch, kitchenSortBy, kitchenSortDir]);
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileSidebarOpen(false);
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    useEffect(() => {
        document.body.style.overflow = isMobileSidebarOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isMobileSidebarOpen]);
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setIsMobileSidebarOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

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
    const handleSidebarAction = (fn) => {
        fn();
        if (window.innerWidth < 1024) {
            setIsMobileSidebarOpen(false);
        }
    };
    const startEditStore = (row) => {
        setEditingStoreId(row.id);
        setStoreErrors({});
        setStoreForm({
            date: row.date || '',
            vendor_name: row.vendor_name || '',
            item_name: row.item_name || '',
            item_category: row.item_category || 'Vegetables',
            quantity: row.quantity ?? '',
            unit: row.unit || 'kg',
            cost_per_unit: row.cost_per_unit ?? '',
            market_rate: row.market_rate ?? '',
            notes: row.notes || '',
            issued_to_kitchen_qty: row.issued_to_kitchen_qty ?? '',
        });
        setView('store-form');
    };
    const startEditKitchen = (row) => {
        setEditingKitchenId(row.id);
        setKitchenErrors({});
        setKitchenForm({
            date: row.date || '',
            meal_type: row.meal_type || 'breakfast',
            submitted_by: row.submitted_by || user?.name || '',
            expected_guests: row.expected_guests ?? '',
            temperature_check_passed: Boolean(row.temperature_check_passed),
            dishes_ran_out: row.dishes_ran_out || '',
            dishes_leftover: row.dishes_leftover || '',
            portion_observation: row.portion_observation || 'Reasonable',
            actual_guests: row.actual_guests ?? '',
            biggest_waste_dish: row.biggest_waste_dish || '',
            staff_meals_count: row.staff_meals_count ?? 0,
            staff_meals_qty: row.staff_meals_qty ?? 0,
            quality_issues: row.quality_issues || '',
            went_well: row.went_well || '',
            change_tomorrow: row.change_tomorrow || '',
        });
        setDishRows(
            (row.dish_waste_logs || []).length > 0
                ? row.dish_waste_logs.map((d) => ({
                    dish_name: d.dish_name || '',
                    quantity_prepped_kg: d.quantity_prepped_kg ?? '',
                    quantity_line_leftover_kg: d.quantity_line_leftover_kg ?? '',
                    quantity_plate_waste_kg: d.quantity_plate_waste_kg ?? '',
                    waste_reason: d.waste_reason || 'Over-prep',
                }))
                : initialDishRows
        );
        setView('kitchen-form');
    };

    const submitStore = async (e) => {
        e.preventDefault();
        if (isStoreSubmitting) return;
        setIsStoreSubmitting(true);
        setStoreErrors({});
        setStatus('');
        try {
            const method = editingStoreId ? 'put' : 'post';
            const url = editingStoreId ? `/store/purchases/${editingStoreId}` : '/store/purchases';
            await api[method](url, normalizeStoreForm(storeForm), { headers });
            setStatus(editingStoreId ? 'Store entry updated.' : 'Store entry submitted.');
            showToast(editingStoreId ? 'Store entry updated successfully.' : 'Store entry submitted successfully.', 'success');
            setStoreForm(initialStoreForm);
            setStoreErrors({});
            setEditingStoreId(null);
        } catch (error) {
            const validationErrors = extractLaravelErrors(error);
            if (Object.keys(validationErrors).length > 0) {
                setStoreErrors(validationErrors);
                showToast('Please fix the highlighted Store form fields.', 'error');
            } else {
                setStatus('Unable to submit store entry. Please try again.');
                showToast('Unable to submit store entry. Please try again.', 'error');
            }
        } finally {
            await Promise.all([refresh(), fetchStoreList(storeListMeta.page)]);
            setIsStoreSubmitting(false);
        }
    };

    const submitKitchen = async (e) => {
        e.preventDefault();
        if (isKitchenSubmitting) return;
        setIsKitchenSubmitting(true);
        setKitchenErrors({});
        setStatus('');
        try {
            const payload = {
                ...normalizeKitchenForm(kitchenForm),
                date: kitchenForm.date,
                expected_guest_headcount: kitchenForm.expected_guests === '' ? null : Number(kitchenForm.expected_guests),
                dish_waste_rows: dishRows.map((row) => ({
                    ...row,
                    quantity_prepped_kg: row.quantity_prepped_kg === '' ? null : Number(row.quantity_prepped_kg),
                    quantity_line_leftover_kg: row.quantity_line_leftover_kg === '' ? null : Number(row.quantity_line_leftover_kg),
                    quantity_plate_waste_kg: row.quantity_plate_waste_kg === '' ? null : Number(row.quantity_plate_waste_kg),
                    calculated_waste_cost: 0,
                })),
            };
            const method = editingKitchenId ? 'put' : 'post';
            const url = editingKitchenId ? `/kitchen/submissions/${editingKitchenId}` : '/kitchen/submissions';
            await api[method](url, payload, { headers });
            setStatus(editingKitchenId ? 'Kitchen entry updated.' : 'Kitchen entry submitted.');
            showToast(editingKitchenId ? 'Kitchen log updated successfully.' : 'Kitchen log submitted successfully.', 'success');
            setKitchenForm(initialKitchenForm(user?.name || ''));
            setDishRows(initialDishRows);
            setKitchenErrors({});
            setEditingKitchenId(null);
        } catch (error) {
            const validationErrors = extractLaravelErrors(error);
            if (Object.keys(validationErrors).length > 0) {
                setKitchenErrors(validationErrors);
                showToast('Please fix the highlighted Kitchen form fields.', 'error');
            } else {
                setStatus('Unable to submit kitchen entry. Please try again.');
                showToast('Unable to submit kitchen entry. Please try again.', 'error');
            }
        } finally {
            await Promise.all([refresh(), fetchKitchenList(kitchenListMeta.page)]);
            setIsKitchenSubmitting(false);
        }
    };
    const deleteStoreRow = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Store record?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#b84a17',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
        });
        if (!result.isConfirmed) return;
        setDeletingStoreId(id);
        try {
            await api.delete(`/store/purchases/${id}`, { headers });
            showToast('Store record deleted successfully.', 'success');
            await Swal.fire({
                title: 'Deleted!',
                text: 'Store record was deleted successfully.',
                icon: 'success',
                timer: 1300,
                showConfirmButton: false,
            });
            setStoreListRows((rows) => rows.filter((r) => r.id !== id));
            await fetchStoreList(storeListMeta.page);
        } catch {
            showToast('Unable to delete Store record.', 'error');
            await Swal.fire({
                title: 'Delete failed',
                text: 'Unable to delete Store record.',
                icon: 'error',
                confirmButtonColor: '#b84a17',
            });
        } finally {
            setDeletingStoreId(null);
        }
    };
    const deleteKitchenRow = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Kitchen record?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#b84a17',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
        });
        if (!result.isConfirmed) return;
        setDeletingKitchenId(id);
        try {
            await api.delete(`/kitchen/submissions/${id}`, { headers });
            showToast('Kitchen record deleted successfully.', 'success');
            await Swal.fire({
                title: 'Deleted!',
                text: 'Kitchen record was deleted successfully.',
                icon: 'success',
                timer: 1300,
                showConfirmButton: false,
            });
            setKitchenListRows((rows) => rows.filter((r) => r.id !== id));
            await fetchKitchenList(kitchenListMeta.page);
        } catch {
            showToast('Unable to delete Kitchen record.', 'error');
            await Swal.fire({
                title: 'Delete failed',
                text: 'Unable to delete Kitchen record.',
                icon: 'error',
                confirmButtonColor: '#b84a17',
            });
        } finally {
            setDeletingKitchenId(null);
        }
    };

    return (
        <main className="min-h-screen p-2 md:p-4">
            <div className="fixed top-4 right-4 z-[70] space-y-2">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`min-w-[220px] max-w-[320px] rounded-lg border px-3 py-2 text-sm shadow-lg ${toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
            {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} />}
            <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-[210px_1fr] gap-3">
                <aside className={`ash-panel rounded-xl p-3 h-fit z-50 fixed top-0 left-0 h-full w-[260px] overflow-y-auto transform transition-transform duration-300 ease-in-out lg:sticky lg:top-3 lg:h-fit lg:w-auto lg:overflow-visible lg:transform-none ${
                    isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}>
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h2 className="text-xl font-bold text-black leading-tight">Ashapuri</h2>
                            <p className="text-[10px] tracking-wide uppercase text-gray-500 mb-4">Operations</p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close sidebar"
                            className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-md border border-transparent hover:border-gray-300 hover:bg-gray-100 text-base leading-none cursor-pointer z-10"
                            onClick={() => setIsMobileSidebarOpen(false)}
                        >
                            ×
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <p className="text-[10px] tracking-wide uppercase text-gray-400 mb-1">Departments</p>
                            {canKitchen && (
                                <div className="mb-1">
                                    <button
                                        className={`w-full flex items-center justify-between text-left text-[13px] px-2.5 py-1.5 rounded-md border ${
                                            ['kitchen-list', 'kitchen-form'].includes(view) ? 'bg-black text-white border-black' : 'border-transparent hover:bg-orange-50'
                                        }`}
                                        onClick={() => setIsKitchenMenuOpen((open) => !open)}
                                    >
                                        <span>Kitchen</span>
                                        <span className={`${['kitchen-list', 'kitchen-form'].includes(view) ? 'text-red-400' : 'text-gray-300'}`}>{isKitchenMenuOpen ? '−' : '+'}</span>
                                    </button>
                                    {isKitchenMenuOpen && (
                                        <div className="ml-2 mt-1 space-y-1">
                                            <button className={`w-full text-left text-[12px] px-2.5 py-1.5 rounded-md border ${view === 'kitchen-list' ? 'bg-black text-white border-black' : 'border-transparent hover:bg-orange-50'}`} onClick={() => handleSidebarAction(() => setView('kitchen-list'))}>List</button>
                                            <button className={`w-full text-left text-[12px] px-2.5 py-1.5 rounded-md border ${view === 'kitchen-form' ? 'bg-black text-white border-black' : 'border-transparent hover:bg-orange-50'}`} onClick={() => handleSidebarAction(() => setView('kitchen-form'))}>Submit Kitchen Form</button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {canStore && (
                                <div className="mb-1">
                                    <button
                                        className={`w-full flex items-center justify-between text-left text-[13px] px-2.5 py-1.5 rounded-md border ${
                                            ['store-list', 'store-form'].includes(view) ? 'bg-black text-white border-black' : 'border-transparent hover:bg-orange-50'
                                        }`}
                                        onClick={() => setIsStoreMenuOpen((open) => !open)}
                                    >
                                        <span>Store</span>
                                        <span className={`${['store-list', 'store-form'].includes(view) ? 'text-red-400' : 'text-gray-300'}`}>{isStoreMenuOpen ? '−' : '+'}</span>
                                    </button>
                                    {isStoreMenuOpen && (
                                        <div className="ml-2 mt-1 space-y-1">
                                            <button className={`w-full text-left text-[12px] px-2.5 py-1.5 rounded-md border ${view === 'store-list' ? 'bg-black text-white border-black' : 'border-transparent hover:bg-orange-50'}`} onClick={() => handleSidebarAction(() => setView('store-list'))}>List</button>
                                            <button className={`w-full text-left text-[12px] px-2.5 py-1.5 rounded-md border ${view === 'store-form' ? 'bg-black text-white border-black' : 'border-transparent hover:bg-orange-50'}`} onClick={() => handleSidebarAction(() => setView('store-form'))}>Submit Store Form</button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {['Housekeeping', 'Laundry', 'Maintenance'].map((it) => (
                                <button
                                    key={it}
                                    className="w-full flex items-center justify-between text-left text-[13px] px-2.5 py-1.5 rounded-md border border-transparent hover:bg-orange-50"
                                    onClick={() => setIsMobileSidebarOpen(false)}
                                >
                                    <span>{it}</span>
                                    <span className="text-gray-300">•</span>
                                </button>
                            ))}
                        </div>

                        <div>
                            <p className="text-[10px] tracking-wide uppercase text-gray-400 mb-1">Reports</p>
                            <button className={`w-full flex items-center justify-between text-left text-[13px] px-2.5 py-1.5 rounded-md border ${view === 'report-daily' ? 'bg-black text-white border-black' : 'border-transparent hover:bg-orange-50'}`} onClick={() => handleSidebarAction(() => setView('report-daily'))}>
                                <span>Daily Summary</span><span className="text-gray-300">•</span>
                            </button>
                            <button className={`w-full flex items-center justify-between text-left text-[13px] px-2.5 py-1.5 rounded-md border ${view === 'report-vendor' ? 'bg-black text-white border-black' : 'border-transparent hover:bg-orange-50'}`} onClick={() => handleSidebarAction(() => setView('report-vendor'))}>
                                <span>Vendor Analysis</span><span className="text-gray-300">•</span>
                            </button>
                            <button className={`w-full flex items-center justify-between text-left text-[13px] px-2.5 py-1.5 rounded-md border ${view === 'report-waste' ? 'bg-black text-white border-black' : 'border-transparent hover:bg-orange-50'}`} onClick={() => handleSidebarAction(() => setView('report-waste'))}>
                                <span>Waste Log</span><span className="text-gray-300">•</span>
                            </button>
                        </div>

                        <div>
                            <p className="text-[10px] tracking-wide uppercase text-gray-400 mb-1">System</p>
                            <button className={`w-full text-left text-[13px] px-2.5 py-1.5 rounded-md border ${view === 'dashboard' ? 'bg-black text-white border-black' : 'border-transparent hover:bg-orange-50'}`} onClick={() => handleSidebarAction(() => setView('dashboard'))}>Dashboard</button>
                            <button className="w-full text-left text-[13px] px-2.5 py-1.5 rounded-md border border-transparent hover:bg-orange-50" onClick={() => handleSidebarAction(logout)}>Logout</button>
                        </div>
                    </div>
                </aside>

                <section className="space-y-2.5">
                    <div className="ash-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <button
                                type="button"
                                aria-label="Toggle sidebar menu"
                                className="lg:hidden inline-flex items-center justify-center border rounded-md px-2 py-1 text-sm mb-2 cursor-pointer"
                                onClick={() => setIsMobileSidebarOpen((open) => !open)}
                            >
                                ☰
                            </button>
                            <h1 className="text-3xl font-semibold tracking-tight">Kitchen Dashboard</h1>
                            <p className="text-xs text-gray-500">{new Date().toDateString()} · Manali · {user?.role}</p>
                        </div>
                        {showPeriodFilters && (
                            <div className="flex gap-2">
                                {['today', 'week', 'month', '6m', 'year'].map((p) => (
                                    <button key={p} onClick={() => setPeriod(p)} className={`px-2.5 py-1 text-[11px] rounded-md border ${period === p ? 'bg-black text-white' : 'bg-white'}`}>{p}</button>
                                ))}
                                <button className="px-2.5 py-1 text-[11px] rounded-md border bg-white disabled:opacity-60" disabled={isRefreshing} onClick={refresh}>{isRefreshing ? 'Refreshing...' : 'Refresh'}</button>
                            </div>
                        )}
                    </div>
                    {lastUpdated && <p className="text-[11px] text-gray-500 px-1">Last updated: {lastUpdated}</p>}

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
                                        <tbody>
                                            {vendorRows.length > 0 ? (
                                                vendorRows.map((r, i) => (
                                                    <tr key={i}>
                                                        <td>{r.item}</td>
                                                        <td>{r.qty_used}</td>
                                                        <td>Rs {r.cost_per_unit}</td>
                                                        <td>Rs {r.market_rate}</td>
                                                        <td>Rs {r.overpay_per_unit}</td>
                                                        <td>Rs {r.monthly_loss}</td>
                                                        <td>{r.action}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={7} className="text-center text-gray-500 py-5">
                                                        No records found for vendor analysis.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {user?.role === 'Admin/GM' && (
                                <section className="ash-panel rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold">Ask the AI</h3>
                                        <span className="text-[11px] text-gray-400">Kitchen Assistant</span>
                                    </div>
                                    <textarea
                                        rows={3}
                                        className="w-full border rounded-lg p-3 text-sm bg-white"
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        placeholder="Ask anything about kitchen, waste, vendors, and costs..."
                                    />
                                    <div className="flex justify-end">
                                        <button className="ash-button px-4 py-2 rounded-lg disabled:opacity-40" disabled={!canAsk} onClick={askAi}>Send</button>
                                    </div>
                                    <div className="bg-white rounded-lg border min-h-[70px] p-3 text-sm whitespace-pre-wrap">
                                        {aiAnswer || 'AI answer will appear here.'}
                                    </div>
                                </section>
                            )}
                        </>
                    )}

                    {view === 'store-form' && canStore && (
                        <StoreForm
                            storeForm={storeForm}
                            setStoreForm={setStoreForm}
                            submitStore={submitStore}
                            storeErrors={storeErrors}
                            setStoreErrors={setStoreErrors}
                            isStoreSubmitting={isStoreSubmitting}
                            editingStoreId={editingStoreId}
                            onCancelEdit={() => {
                                setEditingStoreId(null);
                                setStoreForm(initialStoreForm);
                                setStoreErrors({});
                            }}
                        />
                    )}
                    {view === 'kitchen-form' && canKitchen && (
                        <KitchenForm
                            kitchenForm={kitchenForm}
                            setKitchenForm={setKitchenForm}
                            dishRows={dishRows}
                            setDishRows={setDishRows}
                            submitKitchen={submitKitchen}
                            kitchenErrors={kitchenErrors}
                            setKitchenErrors={setKitchenErrors}
                            isKitchenSubmitting={isKitchenSubmitting}
                            editingKitchenId={editingKitchenId}
                            onCancelEdit={() => {
                                setEditingKitchenId(null);
                                setKitchenForm(initialKitchenForm(user?.name || ''));
                                setDishRows(initialDishRows);
                                setKitchenErrors({});
                            }}
                        />
                    )}
                    {view === 'kitchen-list' && canKitchen && (
                        <KitchenList
                            rows={kitchenListRows}
                            loading={isKitchenListLoading}
                            search={kitchenSearch}
                            onSearch={setKitchenSearch}
                            sortBy={kitchenSortBy}
                            setSortBy={setKitchenSortBy}
                            sortDir={kitchenSortDir}
                            setSortDir={setKitchenSortDir}
                            meta={kitchenListMeta}
                            onPageChange={fetchKitchenList}
                            onEdit={startEditKitchen}
                            onDelete={deleteKitchenRow}
                            deletingKitchenId={deletingKitchenId}
                        />
                    )}
                    {view === 'store-list' && canStore && (
                        <StoreList
                            rows={storeListRows}
                            loading={isStoreListLoading}
                            search={storeSearch}
                            onSearch={setStoreSearch}
                            sortBy={storeSortBy}
                            setSortBy={setStoreSortBy}
                            sortDir={storeSortDir}
                            setSortDir={setStoreSortDir}
                            meta={storeListMeta}
                            onPageChange={fetchStoreList}
                            onEdit={startEditStore}
                            onDelete={deleteStoreRow}
                            deletingStoreId={deletingStoreId}
                        />
                    )}
                    {view === 'report-daily' && (
                        <section className="ash-panel rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Daily Summary Report</h3>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 text-xs border rounded-md bg-white" onClick={() => downloadCsv('daily-summary-report.csv', [
                                        ['Metric', 'Value'],
                                        ['Guests Served', kpi?.guests_served ?? 0],
                                        ['Food Waste Kg', kpi?.food_waste_kg ?? 0],
                                        ['Food Waste Percent', kpi?.food_waste_percent ?? 0],
                                        ['Cost Per Cover', kpi?.cost_per_cover ?? 0],
                                    ])}>Export CSV</button>
                                    <button className="px-3 py-1 text-xs border rounded-md bg-white" onClick={() => window.print()}>Print / PDF</button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600">Period: {period}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Kpi title="Guests Served" value={kpi?.guests_served ?? 0} note="Selected period" />
                                <Kpi title="Food Waste" value={`${kpi?.food_waste_kg ?? 0} kg`} note={`${kpi?.food_waste_percent ?? 0}% of prep`} />
                                <Kpi title="Cost Per Cover" value={`Rs ${kpi?.cost_per_cover ?? 0}`} note="Average" />
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                <Chart title="Guests Trend" data={guestTrend} dataKey="guests" />
                                <Chart title="Waste Trend" data={wasteTrend} dataKey="waste_kg" />
                                <Chart title="Cost/Cover Trend" data={costTrend} dataKey="cost_per_cover" />
                            </div>
                            <div className="ash-panel rounded-lg p-3 text-sm">{aiDailySummary || 'No summary found for selected period.'}</div>
                        </section>
                    )}
                    {view === 'report-vendor' && (
                        <section className="ash-panel rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Vendor Analysis Report</h3>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 text-xs border rounded-md bg-white" onClick={() => downloadCsv('vendor-analysis-report.csv', [
                                        ['Item', 'Used', 'Your Cost', 'Market', 'Overpay/Unit', 'Overpay/Mo', 'Action'],
                                        ...vendorRows.map((r) => [r.item, r.qty_used, r.cost_per_unit, r.market_rate, r.overpay_per_unit, r.monthly_loss, r.action]),
                                    ])}>Export CSV</button>
                                    <button className="px-3 py-1 text-xs border rounded-md bg-white" onClick={() => window.print()}>Print / PDF</button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600">Period: {period}</p>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <Chart title="Your Cost (By Item)" data={vendorRows.map((r) => ({ date: r.item, value: r.cost_per_unit }))} dataKey="value" />
                                <Chart title="Market Rate (By Item)" data={vendorRows.map((r) => ({ date: r.item, value: r.market_rate }))} dataKey="value" />
                            </div>
                            <div className="overflow-auto">
                                <table className="themed-table min-w-[860px]">
                                    <thead><tr><th>Item</th><th>Used</th><th>Your Cost</th><th>Market</th><th>Overpay/Unit</th><th>Overpay/Mo</th><th>Action</th></tr></thead>
                                    <tbody>
                                        {vendorRows.length > 0 ? vendorRows.map((r, i) => (
                                            <tr key={i}><td>{r.item}</td><td>{r.qty_used}</td><td>Rs {r.cost_per_unit}</td><td>Rs {r.market_rate}</td><td>Rs {r.overpay_per_unit}</td><td>Rs {r.monthly_loss}</td><td>{r.action}</td></tr>
                                        )) : <tr><td colSpan={7} className="text-center py-4 text-gray-500">No records found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                    {view === 'report-waste' && (
                        <section className="ash-panel rounded-xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Waste Log Report</h3>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 text-xs border rounded-md bg-white" onClick={() => downloadCsv('waste-log-report.csv', [
                                        ['Date', 'Meal', 'Submitted By', 'Guests', 'Biggest Waste', 'Portion', 'Change Tomorrow'],
                                        ...kitchenLogs.map((row) => [row.date, row.meal_type, row.submitted_by, row.actual_guests, row.biggest_waste_dish || '-', row.portion_observation || '-', row.change_tomorrow || '-']),
                                    ])}>Export CSV</button>
                                    <button className="px-3 py-1 text-xs border rounded-md bg-white" onClick={() => window.print()}>Print / PDF</button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600">Recent kitchen submissions</p>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <Chart title="Waste Trend (Daily Kg)" data={wasteTrend} dataKey="waste_kg" />
                                <Chart title="Guests Trend (Daily)" data={guestTrend} dataKey="guests" />
                            </div>
                            <div className="overflow-auto">
                                <table className="themed-table min-w-[960px]">
                                    <thead><tr><th>Date</th><th>Meal</th><th>Submitted By</th><th>Guests</th><th>Biggest Waste</th><th>Portion</th><th>Change Tomorrow</th></tr></thead>
                                    <tbody>
                                        {kitchenLogs.length > 0 ? kitchenLogs.map((row) => (
                                            <tr key={row.id}><td>{row.date}</td><td>{row.meal_type}</td><td>{row.submitted_by}</td><td>{row.actual_guests}</td><td>{row.biggest_waste_dish || '-'}</td><td>{row.portion_observation || '-'}</td><td>{row.change_tomorrow || '-'}</td></tr>
                                        )) : <tr><td colSpan={7} className="text-center py-4 text-gray-500">No waste logs found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
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

function StoreForm({ storeForm, setStoreForm, submitStore, storeErrors, setStoreErrors, isStoreSubmitting, editingStoreId, onCancelEdit }) {
    const updateStoreField = (field, value) => {
        setStoreForm((s) => ({ ...s, [field]: value }));
        if (storeErrors[field]) {
            setStoreErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    return (
        <form onSubmit={submitStore} className="ash-panel rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">{editingStoreId ? 'Edit Store / Procurement Form' : 'Store / Procurement Form'}</h3>
            {Object.keys(storeErrors).length > 0 && (
                <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm">
                    Please fix the highlighted fields and try submitting again.
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="Date of purchase" type="date" value={storeForm.date} onChange={(v) => updateStoreField('date', v)} required error={storeErrors.date} />
                <Input label="Vendor name" value={storeForm.vendor_name} onChange={(v) => updateStoreField('vendor_name', v)} required error={storeErrors.vendor_name} />
                <Input label="Item name" value={storeForm.item_name} onChange={(v) => updateStoreField('item_name', v)} required error={storeErrors.item_name} />
                <Select label="Item category" value={storeForm.item_category} onChange={(v) => updateStoreField('item_category', v)} options={['Vegetables', 'Meat', 'Dairy', 'Pantry', 'Beverages']} error={storeErrors.item_category} />
                <Input label="Quantity received" type="number" value={storeForm.quantity} onChange={(v) => updateStoreField('quantity', v)} required error={storeErrors.quantity} />
                <Select label="Unit" value={storeForm.unit} onChange={(v) => updateStoreField('unit', v)} options={['kg', 'litre', 'packet', 'piece']} error={storeErrors.unit} />
                <Input label="Cost per unit (Rs)" type="number" value={storeForm.cost_per_unit} onChange={(v) => updateStoreField('cost_per_unit', v)} required error={storeErrors.cost_per_unit} />
                <Input label="Market rate (Rs)" type="number" value={storeForm.market_rate} onChange={(v) => updateStoreField('market_rate', v)} error={storeErrors.market_rate} />
                <Input label="Issued to kitchen (qty)" type="number" value={storeForm.issued_to_kitchen_qty} onChange={(v) => updateStoreField('issued_to_kitchen_qty', v)} error={storeErrors.issued_to_kitchen_qty} />
            </div>
            <TextArea label="Notes" value={storeForm.notes} onChange={(v) => updateStoreField('notes', v)} error={storeErrors.notes} />
            <div className="flex items-center gap-2">
                <button type="submit" disabled={isStoreSubmitting} className="ash-button px-4 py-2 rounded-lg cursor-pointer hover:cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                    {isStoreSubmitting ? 'Submitting...' : editingStoreId ? 'Update Store Entry' : 'Submit Store Entry'}
                </button>
                {editingStoreId && (
                    <button type="button" className="border rounded-lg px-4 py-2 text-sm cursor-pointer hover:bg-gray-50" onClick={onCancelEdit}>
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}

function KitchenForm({ kitchenForm, setKitchenForm, dishRows, setDishRows, submitKitchen, kitchenErrors, setKitchenErrors, isKitchenSubmitting, editingKitchenId, onCancelEdit }) {
    const updateKitchenField = (field, value) => {
        setKitchenForm((s) => ({ ...s, [field]: value }));
        if (kitchenErrors[field] || (field === 'expected_guests' && kitchenErrors.expected_guest_headcount)) {
            setKitchenErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                if (field === 'expected_guests') delete next.expected_guest_headcount;
                return next;
            });
        }
    };
    const updateDishField = (idx, key, value) => {
        updateDish(setDishRows, idx, key, value);
        const errorKey = `dish_waste_rows.${idx}.${key}`;
        if (kitchenErrors[errorKey]) {
            setKitchenErrors((prev) => {
                const next = { ...prev };
                delete next[errorKey];
                return next;
            });
        }
    };

    return (
        <form onSubmit={submitKitchen} className="ash-panel rounded-xl p-4 space-y-3">
            <h3 className="font-semibold">{editingKitchenId ? 'Edit Kitchen Daily Log Form' : 'Kitchen Daily Log Form'}</h3>
            {Object.keys(kitchenErrors).length > 0 && (
                <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm">
                    Please fix the highlighted fields and try submitting again.
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="Date of service" type="date" value={kitchenForm.date} onChange={(v) => updateKitchenField('date', v)} required error={kitchenErrors.date} name="date" />
                <Select label="Meal type" value={kitchenForm.meal_type} onChange={(v) => updateKitchenField('meal_type', v)} options={['breakfast', 'lunch', 'dinner']} error={kitchenErrors.meal_type} />
                <Input label="Submitted by" value={kitchenForm.submitted_by} onChange={(v) => updateKitchenField('submitted_by', v)} required error={kitchenErrors.submitted_by} />
                <Input label="Expected guest headcount" type="number" value={kitchenForm.expected_guests} onChange={(v) => updateKitchenField('expected_guests', v)} required error={kitchenErrors.expected_guests || kitchenErrors.expected_guest_headcount} />
                <Select label="Temperature check passed" value={kitchenForm.temperature_check_passed ? 'Yes' : 'No'} onChange={(v) => updateKitchenField('temperature_check_passed', v === 'Yes')} options={['Yes', 'No']} error={kitchenErrors.temperature_check_passed} />
                <Input label="Actual final guest count" type="number" value={kitchenForm.actual_guests} onChange={(v) => updateKitchenField('actual_guests', v)} required error={kitchenErrors.actual_guests} />
            </div>
            <div className="overflow-auto">
                <table className="themed-table min-w-[760px]">
                    <thead><tr><th>Dish Name</th><th>Prepped (kg)</th><th>Line Leftover (kg)</th><th>Plate Waste (kg)</th><th>Reason</th><th></th></tr></thead>
                    <tbody>
                        {dishRows.map((row, idx) => (
                            <tr key={idx}>
                                <td>
                                    <input className={`w-full border rounded p-1 ${kitchenErrors[`dish_waste_rows.${idx}.dish_name`] ? 'border-red-500' : ''}`} value={row.dish_name} onChange={(e) => updateDishField(idx, 'dish_name', e.target.value)} />
                                    {kitchenErrors[`dish_waste_rows.${idx}.dish_name`] ? <p className="text-xs text-red-600 mt-1">{kitchenErrors[`dish_waste_rows.${idx}.dish_name`]}</p> : null}
                                </td>
                                <td>
                                    <input className={`w-full border rounded p-1 ${kitchenErrors[`dish_waste_rows.${idx}.quantity_prepped_kg`] ? 'border-red-500' : ''}`} value={row.quantity_prepped_kg} onChange={(e) => updateDishField(idx, 'quantity_prepped_kg', e.target.value)} />
                                    {kitchenErrors[`dish_waste_rows.${idx}.quantity_prepped_kg`] ? <p className="text-xs text-red-600 mt-1">{kitchenErrors[`dish_waste_rows.${idx}.quantity_prepped_kg`]}</p> : null}
                                </td>
                                <td>
                                    <input className={`w-full border rounded p-1 ${kitchenErrors[`dish_waste_rows.${idx}.quantity_line_leftover_kg`] ? 'border-red-500' : ''}`} value={row.quantity_line_leftover_kg} onChange={(e) => updateDishField(idx, 'quantity_line_leftover_kg', e.target.value)} />
                                    {kitchenErrors[`dish_waste_rows.${idx}.quantity_line_leftover_kg`] ? <p className="text-xs text-red-600 mt-1">{kitchenErrors[`dish_waste_rows.${idx}.quantity_line_leftover_kg`]}</p> : null}
                                </td>
                                <td>
                                    <input className={`w-full border rounded p-1 ${kitchenErrors[`dish_waste_rows.${idx}.quantity_plate_waste_kg`] ? 'border-red-500' : ''}`} value={row.quantity_plate_waste_kg} onChange={(e) => updateDishField(idx, 'quantity_plate_waste_kg', e.target.value)} />
                                    {kitchenErrors[`dish_waste_rows.${idx}.quantity_plate_waste_kg`] ? <p className="text-xs text-red-600 mt-1">{kitchenErrors[`dish_waste_rows.${idx}.quantity_plate_waste_kg`]}</p> : null}
                                </td>
                                <td>
                                    <select className={`w-full border rounded p-1 ${kitchenErrors[`dish_waste_rows.${idx}.waste_reason`] ? 'border-red-500' : ''}`} value={row.waste_reason} onChange={(e) => updateDishField(idx, 'waste_reason', e.target.value)}>{['Over-prep', 'Spoilage', 'Poor cutting', 'Guest plate', 'Theft', 'Other'].map((o) => <option key={o}>{o}</option>)}</select>
                                    {kitchenErrors[`dish_waste_rows.${idx}.waste_reason`] ? <p className="text-xs text-red-600 mt-1">{kitchenErrors[`dish_waste_rows.${idx}.waste_reason`]}</p> : null}
                                </td>
                                <td><button type="button" className="text-xs border rounded px-2 py-1" onClick={() => setDishRows((rows) => rows.filter((_, i) => i !== idx))}>Remove</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button type="button" className="border rounded px-3 py-1.5" onClick={() => setDishRows((rows) => [...rows, { dish_name: '', quantity_prepped_kg: '', quantity_line_leftover_kg: '', quantity_plate_waste_kg: '', waste_reason: 'Over-prep' }])}>+ Add Dish</button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="Dishes ran out" value={kitchenForm.dishes_ran_out} onChange={(v) => updateKitchenField('dishes_ran_out', v)} error={kitchenErrors.dishes_ran_out} />
                <Input label="Dishes leftover" value={kitchenForm.dishes_leftover} onChange={(v) => updateKitchenField('dishes_leftover', v)} error={kitchenErrors.dishes_leftover} />
                <Select label="Guest portion behavior" value={kitchenForm.portion_observation} onChange={(v) => updateKitchenField('portion_observation', v)} options={['Reasonable', 'Piled high', 'Mixed']} error={kitchenErrors.portion_observation} />
                <Input label="Biggest waste dish" value={kitchenForm.biggest_waste_dish} onChange={(v) => updateKitchenField('biggest_waste_dish', v)} error={kitchenErrors.biggest_waste_dish} />
                <Input label="Staff meals count" type="number" value={kitchenForm.staff_meals_count} onChange={(v) => updateKitchenField('staff_meals_count', v)} error={kitchenErrors.staff_meals_count} />
                <Input label="Staff meals qty" type="number" value={kitchenForm.staff_meals_qty} onChange={(v) => updateKitchenField('staff_meals_qty', v)} error={kitchenErrors.staff_meals_qty} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <TextArea label="Quality issues" value={kitchenForm.quality_issues} onChange={(v) => updateKitchenField('quality_issues', v)} error={kitchenErrors.quality_issues} />
                <TextArea label="What went well today?" value={kitchenForm.went_well} onChange={(v) => updateKitchenField('went_well', v)} error={kitchenErrors.went_well} />
                <TextArea label="Change tomorrow" value={kitchenForm.change_tomorrow} onChange={(v) => updateKitchenField('change_tomorrow', v)} error={kitchenErrors.change_tomorrow} />
            </div>
            <div className="flex items-center gap-2">
                <button type="submit" disabled={isKitchenSubmitting} className="ash-button px-4 py-2 rounded-lg cursor-pointer hover:cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                    {isKitchenSubmitting ? 'Submitting...' : editingKitchenId ? 'Update Kitchen Log' : 'Submit Kitchen Log'}
                </button>
                {editingKitchenId && (
                    <button type="button" className="border rounded-lg px-4 py-2 text-sm cursor-pointer hover:bg-gray-50" onClick={onCancelEdit}>
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}

function KitchenList({ rows, loading, search, onSearch, sortBy, setSortBy, sortDir, setSortDir, meta, onPageChange, onEdit, onDelete, deletingKitchenId }) {
    return (
        <section className="ash-panel rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Kitchen Submissions</h3>
                <div className="flex gap-2">
                    <input className="border rounded-md px-2 py-1 text-sm" placeholder="Search meal, date, submitted by" value={search} onChange={(e) => onSearch(e.target.value)} />
                    <select className="border rounded-md px-2 py-1 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="date">Date</option>
                        <option value="meal_type">Meal Type</option>
                        <option value="submitted_by">Submitted By</option>
                        <option value="expected_guests">Expected Guests</option>
                        <option value="actual_guests">Actual Guests</option>
                        <option value="created_at">Created At</option>
                    </select>
                    <select className="border rounded-md px-2 py-1 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                    </select>
                </div>
            </div>
            <div className="overflow-auto">
                <table className="themed-table min-w-[980px]">
                    <thead><tr><th>Date</th><th>Meal Type</th><th>Submitted By</th><th>Expected Guest Count</th><th>Actual Guest Count</th><th>Created At</th><th>Actions</th></tr></thead>
                    <tbody>
                        {rows.length > 0 ? rows.map((row) => (
                            <tr key={row.id}>
                                <td>{row.date}</td>
                                <td className="capitalize">{row.meal_type}</td>
                                <td>{row.submitted_by}</td>
                                <td>{row.expected_guests}</td>
                                <td>{row.actual_guests}</td>
                                <td>{formatDateTime(row.created_at)}</td>
                                <td>
                                    <div className="flex gap-2">
                                        <button type="button" className="text-xs border rounded px-2 py-1 cursor-pointer hover:bg-gray-50" onClick={() => onEdit(row)}>Edit</button>
                                        <button type="button" disabled={deletingKitchenId === row.id} className="text-xs border rounded px-2 py-1 cursor-pointer hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed" onClick={() => onDelete(row.id)}>
                                            {deletingKitchenId === row.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={7} className="text-center py-4 text-gray-500">{loading ? 'Loading...' : 'No kitchen records found.'}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination meta={meta} onPageChange={onPageChange} />
        </section>
    );
}

function StoreList({ rows, loading, search, onSearch, sortBy, setSortBy, sortDir, setSortDir, meta, onPageChange, onEdit, onDelete, deletingStoreId }) {
    return (
        <section className="ash-panel rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Store Submissions</h3>
                <div className="flex gap-2">
                    <input className="border rounded-md px-2 py-1 text-sm" placeholder="Search vendor, item, category" value={search} onChange={(e) => onSearch(e.target.value)} />
                    <select className="border rounded-md px-2 py-1 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="date">Date</option>
                        <option value="vendor_name">Vendor Name</option>
                        <option value="item_name">Item Name</option>
                        <option value="quantity">Quantity</option>
                        <option value="cost_per_unit">Cost Per Unit</option>
                        <option value="created_at">Created At</option>
                    </select>
                    <select className="border rounded-md px-2 py-1 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                    </select>
                </div>
            </div>
            <div className="overflow-auto">
                <table className="themed-table min-w-[980px]">
                    <thead><tr><th>Date</th><th>Vendor</th><th>Item</th><th>Category</th><th>Quantity</th><th>Cost/Unit</th><th>Created At</th><th>Actions</th></tr></thead>
                    <tbody>
                        {rows.length > 0 ? rows.map((row) => (
                            <tr key={row.id}>
                                <td>{row.date}</td>
                                <td>{row.vendor_name}</td>
                                <td>{row.item_name}</td>
                                <td>{row.item_category}</td>
                                <td>{row.quantity} {row.unit}</td>
                                <td>Rs {row.cost_per_unit}</td>
                                <td>{formatDateTime(row.created_at)}</td>
                                <td>
                                    <div className="flex gap-2">
                                        <button type="button" className="text-xs border rounded px-2 py-1 cursor-pointer hover:bg-gray-50" onClick={() => onEdit(row)}>Edit</button>
                                        <button type="button" disabled={deletingStoreId === row.id} className="text-xs border rounded px-2 py-1 cursor-pointer hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed" onClick={() => onDelete(row.id)}>
                                            {deletingStoreId === row.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={8} className="text-center py-4 text-gray-500">{loading ? 'Loading...' : 'No store records found.'}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination meta={meta} onPageChange={onPageChange} />
        </section>
    );
}

function Pagination({ meta, onPageChange }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <p className="text-gray-500">Total: {meta.total || 0}</p>
            <div className="flex gap-2">
                <button type="button" className="border rounded px-3 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>Prev</button>
                <span className="px-2 py-1">Page {meta.page || 1} / {meta.lastPage || 1}</span>
                <button type="button" className="border rounded px-3 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" disabled={(meta.page || 1) >= (meta.lastPage || 1)} onClick={() => onPageChange((meta.page || 1) + 1)}>Next</button>
            </div>
        </div>
    );
}

function Input({ label, onChange, required, error, className = '', ...props }) {
    return (
        <label className="block text-sm">
            {label}
            {required ? <span className="text-red-500"> *</span> : null}
            <input
                {...props}
                className={`w-full border rounded-lg px-3 py-2 mt-1 text-sm ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${className}`.trim()}
                onChange={(e) => onChange(e.target.value)}
            />
            {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
        </label>
    );
}
function Select({ label, options, onChange, error, ...props }) {
    return (
        <label className="block text-sm">
            {label}
            <select
                {...props}
                className={`w-full border rounded-lg px-3 py-2 mt-1 text-sm ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`.trim()}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
        </label>
    );
}
function TextArea({ label, value, onChange, error }) {
    return (
        <label className="block text-sm">
            {label}
            <textarea className={`w-full border rounded-lg px-3 py-2 mt-1 text-sm min-h-24 ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`.trim()} value={value} onChange={(e) => onChange(e.target.value)} />
            {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
        </label>
    );
}

function normalizeStoreForm(form) {
    return {
        ...form,
        quantity: form.quantity === '' ? null : Number(form.quantity),
        cost_per_unit: form.cost_per_unit === '' ? null : Number(form.cost_per_unit),
        market_rate: form.market_rate === '' ? null : Number(form.market_rate),
        issued_to_kitchen_qty: form.issued_to_kitchen_qty === '' ? null : Number(form.issued_to_kitchen_qty),
    };
}
function normalizeKitchenForm(form) {
    return {
        ...form,
        expected_guests: form.expected_guests === '' ? null : Number(form.expected_guests),
        actual_guests: form.actual_guests === '' ? null : Number(form.actual_guests),
        staff_meals_count: form.staff_meals_count === '' ? 0 : Number(form.staff_meals_count),
        staff_meals_qty: form.staff_meals_qty === '' ? 0 : Number(form.staff_meals_qty),
    };
}
function updateDish(setDishRows, idx, key, value) {
    setDishRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
}

function extractLaravelErrors(error) {
    const backendErrors = error?.response?.data?.errors;
    if (!backendErrors || typeof backendErrors !== 'object') return {};
    return Object.entries(backendErrors).reduce((acc, [field, messages]) => {
        acc[field] = Array.isArray(messages) ? messages[0] : String(messages);
        return acc;
    }, {});
}

function formatDateTime(value) {
    if (!value) return '-';
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? value : dt.toLocaleString();
}

function downloadCsv(filename, rows) {
    const csv = rows
        .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

import { useEffect, useState } from 'react';
import { 
  Building2, LayoutDashboard, ReceiptText, DollarSign, 
  Search, FileText, Plus, TrendingUp, X, CheckCircle2, 
  AlertTriangle, Eye, Printer, TrendingDown, Users, Briefcase, Lock,
  PanelLeft, Clock, BarChart3, ChevronDown, ArrowUpRight, LogOut, Download
} from 'lucide-react';

import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';

export default function App() {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [userRole, setUserRole] = useState(null);

  // --- NAVIGATION STATE ---
  const [currentView, setCurrentView] = useState('dashboard');
  const [reportTab, setReportTab] = useState('pnl');

  // --- WIDGET TIMELINE STATE ---
  const [plPeriod, setPlPeriod] = useState("This financial year");
  const [expPeriod, setExpPeriod] = useState("This fiscal quarter");
  const [salesPeriod, setSalesPeriod] = useState("This financial year");

  // --- DATA STATE ---
  const [dashboardData, setDashboardData] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  
  const [invoices, setInvoices] = useState([]); 
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // --- REPORT GENERATOR STATE ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [reportForm, setReportForm] = useState({
    type: 'Profit and Loss',
    start_date: '',
    end_date: ''
  });

  // --- FILTER & MODAL STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All Categories');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null); 
  const [formData, setFormData] = useState({ category: 'Director Payout', amount: '', payout_method: 'Bank Wire', reason: '' });

  // --- DATA FETCHING ---
  const loadDashboardData = () => {
    fetch('http://127.0.0.1:8000/api/v1/director/summary')
      .then(res => res.json())
      .then(data => setDashboardData(data))
      .catch(err => console.error("Error loading summary:", err));

    fetch('http://127.0.0.1:8000/api/v1/director/payouts')
      .then(res => res.json())
      .then(data => { setPayouts(Array.isArray(data) ? data : []); setLoadingPayouts(false); })
      .catch(err => { console.error("Error loading payouts:", err); setPayouts([]); setLoadingPayouts(false); });

    fetch('http://127.0.0.1:8000/api/v1/director/invoices')
      .then(res => res.json())
      .then(data => { setInvoices(Array.isArray(data) ? data : []); setLoadingInvoices(false); })
      .catch(err => { console.error("Error loading invoices:", err); setInvoices([]); setLoadingInvoices(false); });
  };

  useEffect(() => {
    if (isAuthenticated) { loadDashboardData(); }
  }, [isAuthenticated]);

  // --- AUTHENTICATION HANDLERS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginForm.email, password: loginForm.password })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.access_token) { localStorage.setItem('parkview_token', data.access_token); setUserRole('Director'); }
        setIsAuthenticated(true);
      } else { alert("Invalid username or password."); }
    } catch (error) { console.error("Login failed:", error); alert("Backend not running."); }
  };

  const handleLogout = () => {
    localStorage.removeItem('parkview_token');
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setLoginForm({ email: '', password: '' });
  };

  // --- FORM HANDLERS ---
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleReportChange = (e) => setReportForm({ ...reportForm, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/director/payouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('parkview_token')}` },
        body: JSON.stringify({ category: formData.category, amount: parseFloat(formData.amount || 0), payout_method: formData.payout_method, reason: formData.reason })
      });
      if (response.ok) {
        loadDashboardData(); setIsModalOpen(false);
        setFormData({ category: 'Director Payout', amount: '', payout_method: 'Bank Wire', reason: '' });
      } else { alert("Failed to submit request."); }
    } catch (error) { console.error("Connection failed", error); }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setLoadingReport(true);
    try {
      // Constructing URL query parameters dynamically based on Esteban's python requirements
      let url = `http://127.0.0.1:8000/api/v1/reports/generate?type=${encodeURIComponent(reportForm.type)}`;
      if (reportForm.start_date && reportForm.type === 'Profit and Loss') url += `&start_date=${reportForm.start_date}`;
      if (reportForm.end_date) url += `&end_date=${reportForm.end_date}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('parkview_token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneratedReport(data);
        setIsReportModalOpen(false);
      } else {
        const err = await response.json();
        alert(err.detail || "Failed to generate report.");
      }
    } catch (error) {
      console.error("Report generation failed:", error);
      alert("Could not connect to the backend report engine.");
    } finally {
      setLoadingReport(false);
    }
  };

  // --- SAFE MATRICES CALCULATORS (LIVE DASHBOARD) ---
  const paidList = invoices.filter(i => i?.status?.toLowerCase() === 'paid');
  const dueList = invoices.filter(i => i?.status?.toLowerCase() === 'due' || i?.status?.toLowerCase() === 'pending');
  const overdueList = invoices.filter(i => i?.status?.toLowerCase() === 'overdue');

  const sumAmount = (list) => list.reduce((acc, curr) => acc + (curr?.amount || 0), 0);
  const paidSum = sumAmount(paidList);
  const dueSum = sumAmount(dueList);
  const overdueSum = sumAmount(overdueList);
  const outstandingSum = dueSum + overdueSum;
  const outstandingCount = dueList.length + overdueList.length;

  const getExpenseSum = (categories) => payouts.filter(p => p?.category && categories.map(c => c.toLowerCase()).includes(p.category.toLowerCase())).reduce((sum, p) => sum + (p?.amount || 0), 0);
  const getIncomeSum = (categories) => invoices.filter(i => i?.status?.toLowerCase() === 'paid' && i?.category && categories.map(c => c.toLowerCase()).includes(i.category.toLowerCase())).reduce((sum, i) => sum + (i?.amount || 0), 0);
  
  const grossRevenue = dashboardData?.financials?.gross_revenue || sumAmount(paidList) || 34637090;
  const totalExpenses = dashboardData?.financials?.total_expenses || sumAmount(payouts) || 23739998;
  const netProfit = dashboardData?.financials?.net_profit || (grossRevenue - totalExpenses) || 10897092;
  const directorSum = getExpenseSum(['Director Payout']);
  const procurementSum = getExpenseSum(['Procurement', 'Suppliers', 'Equipments']);

  const pendingPayoutsCount = payouts.filter(p => !p?.status || p?.status?.toLowerCase() === 'pending').length;
  const approvedPayoutsCount = payouts.filter(p => p?.status?.toLowerCase() === 'approved').length; 
  const paidPayoutsSum = payouts.filter(p => p?.status?.toLowerCase() === 'paid').reduce((sum, p) => sum + (p?.amount || 0), 0);

  const accountsReceivableInvoices = invoices.filter(i => ['due', 'overdue', 'pending'].includes(i?.status?.toLowerCase()));
  const totalAccountsReceivable = outstandingSum || 7655752;
  const pendingAccountsPayable = payouts.filter(p => ['pending', 'approved'].includes(p?.status?.toLowerCase())).reduce((sum, p) => sum + (p?.amount || 0), 0);
  const simulatedCashAtBank = paidSum - paidPayoutsSum; 
  const totalCurrentAssets = simulatedCashAtBank + totalAccountsReceivable;
  const totalLiabilities = pendingAccountsPayable;
  const retainedEarnings = totalCurrentAssets - totalLiabilities - netProfit; 
  const totalEquity = retainedEarnings + netProfit;

  // --- STRUCTURAL VALUE METRICS ---
  const maxPnlValue = Math.max(grossRevenue || 1, totalExpenses || 1);
  const incomeBarWidth = grossRevenue ? `${(grossRevenue / maxPnlValue) * 100}%` : '0%';
  const expensesBarWidth = totalExpenses ? `${(totalExpenses / maxPnlValue) * 100}%` : '0%';

  const PIE_COLORS = ['#e11d48', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
  const expenseBreakdownData = [
    { name: 'KPLC', value: getExpenseSum(['KPLC', 'Electricity']) || 8330045, color: '#e11d48' },
    { name: 'Land Rent', value: getExpenseSum(['LAND RENT', 'Rent']) || 6400000, color: '#2563eb' },
    { name: 'Payroll', value: getExpenseSum(['PAYROLL', 'Salaries & Wages']) || 2210000, color: '#10b981' },
    { name: 'Suppliers', value: getExpenseSum(['SUPPLIERS', 'Supplies']) || 2175507, color: '#f59e0b' },
    { name: 'Security', value: getExpenseSum(['SECURITY', 'Security']) || 1845000, color: '#8b5cf6' },
  ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);

  const totalExpBreakdown = expenseBreakdownData.reduce((sum, item) => sum + item.value, 0) || 1;
  let cumulativePercent = 0;
  const donutStops = expenseBreakdownData.map((item, idx) => {
    const start = cumulativePercent;
    const percentage = (item.value / totalExpBreakdown) * 100;
    cumulativePercent += percentage;
    return `${PIE_COLORS[idx % PIE_COLORS.length]} ${start}% ${cumulativePercent}%`;
  }).join(", ") || "#e2e8f0 0% 100%";

  const trendData = [
    { month: 'Jan', amount: 11500000 }, { month: 'Feb', amount: 12500000 }, { month: 'Mar', amount: 11000000 },
    { month: 'Apr', amount: 13000000 }, { month: 'May', amount: 14000000 }, { month: 'Jun', amount: grossRevenue },
  ];

  const chartHeight = 120; const chartWidth = 400; const paddingX = 30; const paddingY = 20;
  const maxSales = Math.max(...trendData.map(d => d.amount), 1000); 
  const yAxisMax = Math.ceil(maxSales / 1000000) * 1000000;
  const svgPoints = trendData.map((d, i) => {
    const x = paddingX + (i * ((chartWidth - paddingX * 2) / Math.max(trendData.length - 1, 1)));
    const y = chartHeight - paddingY - ((d.amount / yAxisMax) * (chartHeight - paddingY * 2));
    return `${x},${y}`;
  }).join(" ");

  // --- DYNAMIC AGING MATRIX CALCULATOR (LIVE DASHBOARD) ---
  const today = new Date();
  const arLedgerMap = {};
  accountsReceivableInvoices.forEach(inv => {
    if (!inv?.entity) return;
    if (!arLedgerMap[inv.entity]) { arLedgerMap[inv.entity] = { entity: inv.entity, current: 0, d30: 0, d60: 0, d90: 0, over90: 0, total: 0 }; }
    const dueDate = new Date(inv.due_date || new Date());
    const diffDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
    const amount = inv.amount || 0;
    arLedgerMap[inv.entity].total += amount;

    if (diffDays <= 0) arLedgerMap[inv.entity].current += amount;
    else if (diffDays <= 30) arLedgerMap[inv.entity].d30 += amount;
    else if (diffDays <= 60) arLedgerMap[inv.entity].d60 += amount;
    else if (diffDays <= 90) arLedgerMap[inv.entity].d90 += amount;
    else arLedgerMap[inv.entity].over90 += amount;
  });

  const agingLedger = Object.values(arLedgerMap);
  const arTotals = agingLedger.reduce((acc, row) => ({
    current: acc.current + row.current, d30: acc.d30 + row.d30, d60: acc.d60 + row.d60, d90: acc.d90 + row.d90, over90: acc.over90 + row.over90, total: acc.total + row.total
  }), { current: 0, d30: 0, d60: 0, d90: 0, over90: 0, total: 0 });

  // --- TABLES FILTERING ROUTINES ---
  const filteredInvoices = invoices.filter((inv) => {
    const statusStr = inv?.status || '';
    const matchesStatus = statusFilter === 'All Status' || statusStr.toLowerCase() === statusFilter.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (inv?.entity || '').toLowerCase().includes(searchLower) || (inv?.unit_number || '').toLowerCase().includes(searchLower) || `inv-${(inv?.id || '').toString().padStart(3, '0')}`.includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const filteredExpenses = payouts.filter((expense) => expenseCategoryFilter === 'All Categories' || expense?.category === expenseCategoryFilter);

  // --- GLOBAL LAYOUT ACCENTS ---
  const renderStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'paid') return <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-sm">Paid</span>;
    if (s === 'overdue') return <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-red-500 text-white shadow-sm">Overdue</span>;
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500 text-white shadow-sm">Pending</span>;
  };

  const getRecurringStatus = (category) => {
    if (!category) return 'One-time';
    if (['PAYROLL', 'salaries & wages', 'payroll', 'security', 'cleaning'].includes(category.toLowerCase())) return 'Monthly';
    if (['land rent', 'rent'].includes(category.toLowerCase())) return 'Quarterly';
    return 'One-time';
  };
  const expenseCategories = ['All Categories', ...new Set(payouts.map(p => p?.category).filter(Boolean))];

  // ==========================================
  // RENDER: SECURE ENTRANCE
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans antialiased relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-96 bg-[#1e293b] -skew-y-2 origin-top-left -z-10"></div>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 pb-6 text-center border-b border-gray-100">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30"><Building2 className="w-7 h-7 text-white" /></div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Director Portal</h2>
            <p className="text-sm text-gray-500 mt-1">Parkview Mall ERP</p>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Username</label>
              <input type="text" required value={loginForm.email} onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} placeholder="director_jm" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 bg-gray-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Password</label>
              <input type="password" required value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} placeholder="••••••••" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 bg-gray-50 focus:bg-white" />
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md cursor-pointer"><Lock className="w-4 h-4" /> Secure Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-sm antialiased relative">
      
      {/* GLOBAL SIDEBAR */}
      <aside className="w-64 bg-[#1e293b] text-gray-300 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 mt-4 mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center mr-3 shadow-md"><Building2 className="w-4 h-4 text-white" /></div>
          <div><h1 className="text-white font-bold text-base tracking-tight">PropManager</h1><p className="text-[10px] text-gray-400 font-medium tracking-wide">Property & Hospitality ERP</p></div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <button onClick={() => {setCurrentView('dashboard'); setGeneratedReport(null);}} className={`w-full flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${currentView === 'dashboard' ? 'bg-[#2a364a] text-blue-400' : 'hover:bg-[#2a364a]/50 text-gray-400 hover:text-gray-200'}`}><LayoutDashboard className="w-4 h-4 mr-3" /> Dashboard</button>
          <button onClick={() => {setCurrentView('invoices'); setGeneratedReport(null);}} className={`w-full flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${currentView === 'invoices' ? 'bg-[#2a364a] text-blue-400' : 'hover:bg-[#2a364a]/50 text-gray-400 hover:text-gray-200'}`}><ReceiptText className="w-4 h-4 mr-3" /> Invoices</button>
          <button onClick={() => {setCurrentView('expenses'); setGeneratedReport(null);}} className={`w-full flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${currentView === 'expenses' ? 'bg-[#2a364a] text-blue-400' : 'hover:bg-[#2a364a]/50 text-gray-400 hover:text-gray-200'}`}><DollarSign className="w-4 h-4 mr-3" /> Expenses</button>
          <button onClick={() => setCurrentView('reports')} className={`w-full flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${currentView === 'reports' ? 'bg-[#2a364a] text-blue-400' : 'hover:bg-[#2a364a]/50 text-gray-400 hover:text-gray-200'}`}><BarChart3 className="w-4 h-4 mr-3" /> Reports</button>
        </nav>
        <div className="p-4 space-y-1 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer mt-2"><LogOut className="w-4 h-4 mr-3" /> Logout</button>
        </div>
      </aside>

      {/* WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[68px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center text-gray-500"><PanelLeft className="w-5 h-5" /></div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500 text-white text-[11px] font-bold rounded-full">Director</span>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">JM</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          
          {/* ========================================================= */}
          {/* VIEW 1: DASHBOARD */}
          {/* ========================================================= */}
          {currentView === 'dashboard' && (
            <div className="animate-in fade-in duration-300 max-w-7xl space-y-6">
              <div><h2 className="text-2xl font-bold text-slate-900">Business at a glance</h2></div>

              {!dashboardData ? (
                <div className="text-gray-500 animate-pulse font-medium">Loading summary calculations...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CARD 1: PROFIT & LOSS */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profit & Loss</h2>
                        <div className="relative inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer hover:text-slate-900">
                          <select value={plPeriod} onChange={(e) => setPlPeriod(e.target.value)} className="appearance-none bg-transparent pr-4 outline-none cursor-pointer z-10 relative">
                            <option>Last 30 days</option><option>This Month</option><option>This month to date</option><option>This Fiscal quarter</option><option>This Fiscal quarter to date</option><option>This Financial year</option><option>This Financial year to date</option><option>Last Month</option><option>Last Fiscal quarter</option><option>Last Financial year</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-0 top-0.5 text-slate-500 z-0" />
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 font-medium mb-1">Net profit</p>
                      <div className="flex items-center gap-3 mb-2"><h3 className="text-4xl font-bold text-slate-900 tracking-tight">Ksh {netProfit.toLocaleString()}</h3></div>
                      <p className="text-sm font-semibold flex items-center gap-1 mb-6 text-green-600"><ArrowUpRight size={16} /> Up 220% <span className="text-slate-500 font-normal">from previous period</span></p>

                      <div className="mb-4">
                        <p className="text-sm font-bold text-slate-900">Ksh {grossRevenue.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mb-1">Income</p>
                        <div className="w-full bg-slate-100 h-6 rounded-sm overflow-hidden flex"><div className="bg-green-500 h-full transition-all duration-500" style={{ width: incomeBarWidth }}></div></div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Ksh {totalExpenses.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mb-1">Expenses</p>
                        <div className="w-full bg-slate-100 h-6 rounded-sm overflow-hidden flex"><div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: expensesBarWidth }}></div></div>
                      </div>
                    </div>

                    {/* CARD 2: EXPENSES */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expenses</h2>
                        <div className="relative inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer hover:text-slate-900">
                          <select value={expPeriod} onChange={(e) => setExpPeriod(e.target.value)} className="appearance-none bg-transparent pr-4 outline-none cursor-pointer z-10 relative">
                            <option>Last 30 days</option><option>This Month</option><option>This month to date</option><option>This Fiscal quarter</option><option>This Fiscal quarter to date</option><option>This Financial year</option><option>This Financial year to date</option><option>Last Month</option><option>Last Fiscal quarter</option><option>Last Financial year</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-0 top-0.5 text-slate-500 z-0" />
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 font-medium mb-1">Spending</p>
                      <div className="flex items-center gap-3 mb-2"><h3 className="text-4xl font-bold text-slate-900 tracking-tight">Ksh {totalExpenses.toLocaleString()}</h3></div>
                      <p className="text-sm font-semibold flex items-center gap-1 mb-8 text-red-600"><ArrowUpRight size={16} /> Up 172% <span className="text-slate-500 font-normal">from previous period</span></p>

                      <div className="flex items-center gap-8">
                        <div className="w-32 h-32 rounded-full relative shadow-sm shrink-0" style={{ background: `conic-gradient(${donutStops})` }}><div className="absolute inset-0 m-auto w-16 h-16 bg-white rounded-full"></div></div>
                        <div className="flex-1 space-y-3">
                          {expenseBreakdownData.slice(0, 4).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></div><span className="font-bold text-slate-700 truncate w-20">{item.name}</span></div>
                              <span className="font-semibold text-slate-900">{item.value.toLocaleString()}</span>
                              <span className="text-slate-500 font-medium">{((item.value / totalExpBreakdown) * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* CARD 3: SALES */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sales Trend</h2>
                        <div className="relative inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer hover:text-slate-900">
                          <select value={salesPeriod} onChange={(e) => setSalesPeriod(e.target.value)} className="appearance-none bg-transparent pr-4 outline-none cursor-pointer z-10 relative">
                            <option>Last 30 days</option><option>This Month</option><option>This month to date</option><option>This Fiscal quarter</option><option>This Fiscal quarter to date</option><option>This Financial year</option><option>This Financial year to date</option><option>Last Month</option><option>Last Fiscal quarter</option><option>Last Financial year</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-0 top-0.5 text-slate-500 z-0" />
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 font-medium mb-1">Total Accounted</p>
                      <div className="flex items-center gap-3 mb-6"><h3 className="text-4xl font-bold text-slate-900 tracking-tight">Ksh {grossRevenue.toLocaleString()}</h3></div>

                      <div className="w-full relative mt-2 text-xs font-medium text-slate-500">
                        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                          <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="#e2e8f0" strokeWidth="1" />
                          <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="#e2e8f0" strokeWidth="1" />
                          <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="#94a3b8" strokeWidth="1" />
                          <text x={paddingX - 10} y={paddingY + 4} textAnchor="end" fill="#64748b" fontSize="10">{(yAxisMax / 1000000).toFixed(0)}M</text>
                          <text x={paddingX - 10} y={(chartHeight / 2) + 4} textAnchor="end" fill="#64748b" fontSize="10">{((yAxisMax / 2) / 1000000).toFixed(1)}M</text>
                          <text x={paddingX - 10} y={chartHeight - paddingY + 4} textAnchor="end" fill="#64748b" fontSize="10">0</text>
                          {trendData.length > 0 && (<polyline points={svgPoints} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round" />)}
                          {trendData.map((d, i) => {
                            const x = paddingX + (i * ((chartWidth - paddingX * 2) / Math.max(trendData.length - 1, 1)));
                            const y = chartHeight - paddingY - ((d.amount / yAxisMax) * (chartHeight - paddingY * 2));
                            return ( <g key={i}><circle cx={x} cy={y} r="3" fill="#16a34a" stroke="white" strokeWidth="1" /><text x={x} y={chartHeight} textAnchor="middle" fill="#64748b" fontSize="10">{d.month}</text></g> );
                          })}
                        </svg>
                      </div>
                    </div>

                    {/* CARD 4: DOUBLE RECEIVABLE MATRIX */}
                    <div className="grid grid-cols-1 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Accounts Receivable</h2>
                          <p className="text-sm text-slate-600 font-medium mb-1">Unpaid balances</p>
                          <h3 className="text-2xl font-bold text-slate-900">Ksh {totalAccountsReceivable.toLocaleString()}</h3>
                        </div>
                        <div className="mt-6 flex h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full" style={{ width: `${(arTotals.current / (totalAccountsReceivable || 1)) * 100}%`}}></div>
                          <div className="bg-amber-500 h-full" style={{ width: `${((arTotals.d30 + arTotals.d60) / (totalAccountsReceivable || 1)) * 100}%`}}></div>
                        </div>
                        <div className="flex gap-4 mt-3 text-xs font-medium">
                          <div className="flex items-center gap-1.5 text-slate-600"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Current Ledger</div>
                          <div className="flex items-center gap-1.5 text-slate-600"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Overdue Aging</div>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expenses (A/P)</h2>
                          <p className="text-sm text-slate-600 font-medium mb-1">Unpaid bills</p>
                          <h3 className="text-2xl font-bold text-slate-900">Ksh {totalLiabilities.toLocaleString()}</h3>
                        </div>
                        <div className="mt-6 flex h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="bg-cyan-500 h-full" style={{ width: '70%' }}></div><div className="bg-red-500 h-full" style={{ width: '30%' }}></div>
                        </div>
                        <div className="flex gap-4 mt-3 text-xs font-medium">
                          <div className="flex items-center gap-1.5 text-slate-600"><div className="w-2 h-2 rounded-full bg-cyan-500"></div> Current Owed</div>
                          <div className="flex items-center gap-1.5 text-slate-600"><div className="w-2 h-2 rounded-full bg-red-500"></div> Overdue Terms</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PAYOUT MANAGER */}
                  <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-gray-500 mt-1" />
                        <div><h3 className="text-lg font-bold text-gray-900">Payout Requests</h3><p className="text-xs text-gray-500 mt-0.5">Track and post distribution pipelines.</p></div>
                      </div>
                      <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"><Plus className="w-4 h-4 mr-1.5" /> New Request</button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                       <div className="border border-gray-200 rounded-xl p-4"><div className="flex items-center gap-1.5 text-gray-500 text-[13px] mb-2"><Clock className="w-3.5 h-3.5" /> Pending</div><div className="text-xl font-bold text-gray-900">{pendingPayoutsCount}</div></div>
                       <div className="border border-gray-200 rounded-xl p-4"><div className="flex items-center gap-1.5 text-gray-500 text-[13px] mb-2"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</div><div className="text-xl font-bold text-gray-900">{approvedPayoutsCount}</div></div>
                       <div className="border border-gray-200 rounded-xl p-4"><div className="text-gray-500 text-[13px] mb-2">Paid (history)</div><div className="text-xl font-bold text-gray-900">KES {paidPayoutsSum.toLocaleString()}</div></div>
                    </div>
                    <div className="overflow-x-auto border border-gray-100 rounded-lg">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500"><tr><th className="py-3 px-4 font-medium">Ref</th><th className="py-3 px-4 font-medium">Date</th><th className="py-3 px-4 font-medium">Amount</th><th className="py-3 px-4 font-medium">Method</th><th className="py-3 px-4 text-right">Status</th></tr></thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {loadingPayouts ? ( <tr><td colSpan="5" className="py-8 text-center text-gray-400">Loading pipelines...</td></tr> ) : payouts.length === 0 ? ( <tr><td colSpan="5" className="py-8 text-center text-gray-400 bg-gray-50/40">No entries in runtime stack.</td></tr> ) : [...payouts].reverse().slice(0, 5).map((row) => (
                            <tr key={row?.id || Math.random()} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-medium text-gray-900">#PR-{(row?.id || '').toString().padStart(3, '0')}</td>
                              <td className="py-3 px-4 text-gray-500">{row?.date || 'N/A'}</td>
                              <td className="py-3 px-4 font-semibold text-gray-900">KES {(row?.amount || 0).toLocaleString()}</td>
                              <td className="py-3 px-4 text-gray-600">{row?.payout_method}</td>
                              <td className="py-3 px-4 text-right">{renderStatusBadge(row?.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ======================================================= */}
          {/* VIEW 2: INVOICES MODULE */}
          {/* ======================================================= */}
          {currentView === 'invoices' && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-7xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Invoices</h2>
                <p className="text-xs text-gray-500 mt-0.5">Generate, track, and print invoices for tenants and guests</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                  <div><p className="text-sm text-gray-500 mb-1">Total Invoices</p><h3 className="text-3xl font-bold text-gray-900">{invoices.length}</h3></div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><ReceiptText className="w-5 h-5" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                  <div><p className="text-sm text-gray-500 mb-1">Paid</p><h3 className="text-3xl font-bold text-gray-900">{paidList.length}</h3><p className="text-xs text-gray-400 mt-1">KES {paidSum.toLocaleString()}</p></div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                  <div><p className="text-sm text-gray-500 mb-1">Pending</p><h3 className="text-3xl font-bold text-gray-900">{dueList.length}</h3><p className="text-xs text-gray-400 mt-1">KES {dueSum.toLocaleString()}</p></div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                  <div><p className="text-sm text-gray-500 mb-1">Overdue</p><h3 className="text-3xl font-bold text-gray-900">{overdueList.length}</h3><p className="text-xs text-gray-400 mt-1">KES {overdueSum.toLocaleString()}</p></div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
                </div>
              </div>

              {outstandingCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-900">Outstanding Balance: KES {outstandingSum.toLocaleString()}</h4>
                    <p className="text-sm text-red-700/80 mt-0.5">{outstandingCount} invoices require follow-up</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <input type="text" placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 bg-white outline-none cursor-pointer">
                    <option value="All Status">All Status</option><option value="Paid">Paid</option><option value="Pending">Pending</option><option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500"><th className="pb-4">Invoice</th><th className="pb-4">Entity</th><th className="pb-4">Unit</th><th className="pb-4">Category</th><th className="pb-4">Amount</th><th className="pb-4">Due Date</th><th className="pb-4">Status</th><th className="pb-4 text-center">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingInvoices ? ( <tr><td colSpan="8" className="py-8 text-center text-gray-400">Loading arrays...</td></tr> ) : filteredInvoices.length === 0 ? ( <tr><td colSpan="8" className="py-8 text-center text-gray-400">Empty workspace matches.</td></tr> ) : filteredInvoices.map((inv) => (
                        <tr key={inv?.id || Math.random()} className="hover:bg-slate-50/50">
                          <td className="py-4 font-semibold text-gray-900">INV-{(inv?.id || '').toString().padStart(3, '0')}</td>
                          <td className="py-4"><p className="font-semibold text-gray-900">{inv?.entity || 'N/A'}</p><p className="text-[11px] text-gray-500">Tenant</p></td>
                          <td className="py-4 text-gray-600">{inv?.unit_number || 'N/A'}</td>
                          <td className="py-4"><span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium border border-gray-200 text-gray-600 bg-white">{inv?.category || 'General'}</span></td>
                          <td className="py-4 font-bold text-gray-900">KES {(inv?.amount || 0).toLocaleString()}</td>
                          <td className="py-4 text-gray-600">{inv?.due_date || 'N/A'}</td>
                          <td className="py-4">{renderStatusBadge(inv?.status)}</td>
                          <td className="py-4 text-center">
                            <button onClick={() => setSelectedInvoice(inv)} className="text-gray-500 hover:text-blue-600 cursor-pointer"><Eye className="w-5 h-5 mx-auto" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
             </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: EXPENSES MODULE */}
          {/* ======================================================== */}
          {currentView === 'expenses' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-7xl">
              <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Expenses & Payouts</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Building-wide expenses, salaries, wages, and director payouts</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                  <div><p className="text-sm text-gray-500 mb-1">Total Expenses</p><h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {totalExpenses.toLocaleString()}</h3></div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><TrendingDown className="w-5 h-5" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                  <div><p className="text-sm text-gray-500 mb-1">Salaries & Wages</p><h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {getExpenseSum(['PAYROLL', 'Salaries & Wages']).toLocaleString()}</h3></div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Users className="w-5 h-5" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                  <div><p className="text-sm text-gray-500 mb-1">Procurement</p><h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {procurementSum.toLocaleString()}</h3></div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Briefcase className="w-5 h-5" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                  <div><p className="text-sm text-gray-500 mb-1">Director Payouts</p><h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {directorSum.toLocaleString()}</h3></div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
                  <select value={expenseCategoryFilter} onChange={(e) => setExpenseCategoryFilter(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 bg-white outline-none cursor-pointer">
                    {expenseCategories.map(cat => (<option key={cat || 'unknown'} value={cat}>{cat}</option>))}
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-white">
                      <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500"><th className="px-6 py-4">ID</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Recurring</th><th className="px-6 py-4">Approved By</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingPayouts ? ( <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-400">Loading engine arrays...</td></tr> ) : filteredExpenses.length === 0 ? ( <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-400">No layout structures found.</td></tr> ) : [...filteredExpenses].reverse().map((exp) => (
                        <tr key={exp?.id || Math.random()} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-900">E-{(exp?.id || '').toString().padStart(3, '0')}</td>
                          <td className="px-6 py-4"><span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#2563eb] text-white shadow-sm">{exp?.category || 'Uncategorized'}</span></td>
                          <td className="px-6 py-4 text-gray-800">{exp?.reason || 'No description provided.'}</td>
                          <td className="px-6 py-4 font-bold text-gray-900">KES {(exp?.amount || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-gray-600">{exp?.date || 'N/A'}</td>
                          <td className="px-6 py-4"><span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium border border-gray-200 text-gray-600 bg-white">{getRecurringStatus(exp?.category)}</span></td>
                          <td className="px-6 py-4 text-gray-500">Director</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 4: FINANCIAL REPORTS (DYNAMIC GENERATOR) */}
          {/* ========================================== */}
          {currentView === 'reports' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-5xl">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Standard Reports</h2>
                </div>
                
                {/* DYNAMIC REPORT GENERATOR BUTTON */}
                <button 
                  onClick={() => setIsReportModalOpen(true)} 
                  className="bg-[#2ca01c] hover:bg-[#238016] text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors flex items-center shadow-sm cursor-pointer"
                >
                  <FileText className="w-4 h-4 mr-2" /> Generate Report
                </button>
              </div>

              {/* RENDER DYNAMIC API REPORT IF AVAILABLE */}
              {generatedReport ? (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <div className="mb-4 flex justify-between items-center">
                    <button onClick={() => setGeneratedReport(null)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center"><ChevronDown className="w-4 h-4 mr-1 rotate-90"/> Back to Live Overview</button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 shadow-sm cursor-pointer"><Printer className="w-4 h-4" /> Print</button>
                  </div>
                  
                  <div className="bg-white rounded border border-gray-200 shadow-sm p-10 max-w-4xl mx-auto font-sans print:shadow-none print:border-none">
                    <div className="text-center border-b border-gray-300 pb-6 mb-2">
                      <h2 className="text-[17px] font-bold text-gray-900 uppercase tracking-wide">Parkview Mall</h2>
                      <p className="text-[13px] text-gray-600 mt-1">{generatedReport.report}</p>
                      <p className="text-[13px] text-gray-600">{generatedReport.period || `As of ${generatedReport.as_of}`}</p>
                    </div>

                    {/* DYNAMIC RENDER: P&L */}
                    {generatedReport.report === 'Profit and Loss' && (
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-300"><th></th><th className="py-2 text-right font-bold text-gray-900 flex items-center justify-end gap-1"><TrendingUp className="w-3 h-3"/> Total</th></tr></thead>
                        <tbody>
                          <tr className="bg-gray-50 border-b border-gray-200"><td className="py-2 px-2 font-bold text-gray-900 flex items-center gap-1"><span className="text-[10px]">▼</span> Income</td><td></td></tr>
                          {generatedReport.data.income.map(item => (
                            <tr key={item.account}><td className="py-1.5 px-6 text-gray-700 uppercase">{item.account}</td><td className="text-right">Ksh {item.amount.toLocaleString()}</td></tr>
                          ))}
                          <tr className="border-y border-gray-300 font-bold bg-gray-50"><td className="py-2 px-2">Total for Income</td><td className="text-right">Ksh {generatedReport.data.total_income.toLocaleString()}</td></tr>
                          
                          <tr className="bg-gray-50 border-b border-gray-200 mt-4"><td className="py-2 px-2 font-bold text-gray-900 flex items-center gap-1 pt-4"><span className="text-[10px]">▼</span> Expenses</td><td></td></tr>
                          {generatedReport.data.expenses.map(item => (
                            <tr key={item.account}><td className="py-1.5 px-6 text-gray-700 uppercase">{item.account}</td><td className="text-right">Ksh {item.amount.toLocaleString()}</td></tr>
                          ))}
                          <tr className="border-y border-gray-300 font-bold bg-gray-50"><td className="py-2 px-2">Total for Expenses</td><td className="text-right">Ksh {generatedReport.data.total_expenses.toLocaleString()}</td></tr>
                          <tr className="border-b-4 border-double border-gray-400 font-bold bg-gray-100"><td className="py-3 px-2">Net Earnings</td><td className="text-right">Ksh {generatedReport.data.net_earnings.toLocaleString()}</td></tr>
                        </tbody>
                      </table>
                    )}

                    {/* DYNAMIC RENDER: A/R AGEING */}
                    {generatedReport.report === 'A/R Ageing Summary' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-right whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-gray-300 font-bold text-gray-900 uppercase"><th className="py-3 px-2 text-left">Tenant</th><th className="py-3 px-2">Current</th><th className="py-3 px-2">1 - 30</th><th className="py-3 px-2">31 - 60</th><th className="py-3 px-2">61 - 90</th><th className="py-3 px-2">91 and over</th><th className="py-3 px-2">Total</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {generatedReport.data.length === 0 ? ( <tr><td colSpan="7" className="py-8 text-center text-gray-500">All accounts settled.</td></tr> ) : generatedReport.data.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="py-2 px-2 text-left text-gray-700">{row.client}</td>
                                <td>{row.current ? `Ksh ${row.current.toLocaleString()}` : ''}</td>
                                <td>{row.days_1_30 ? `Ksh ${row.days_1_30.toLocaleString()}` : ''}</td>
                                <td>{row.days_31_60 ? `Ksh ${row.days_31_60.toLocaleString()}` : ''}</td>
                                <td>{row.days_61_90 ? `Ksh ${row.days_61_90.toLocaleString()}` : ''}</td>
                                <td>{row.days_91_over ? `Ksh ${row.days_91_over.toLocaleString()}` : ''}</td>
                                <td className="font-semibold">Ksh {row.total.toLocaleString()}</td>
                              </tr>
                            ))}
                            {/* Calculate Dynamic Totals */}
                            {generatedReport.data.length > 0 && (
                              <tr className="border-y-2 border-gray-400 font-bold bg-gray-50">
                                <td className="py-3 px-2 text-left">TOTAL</td>
                                <td>Ksh {generatedReport.data.reduce((sum, r) => sum + r.current, 0).toLocaleString()}</td>
                                <td>Ksh {generatedReport.data.reduce((sum, r) => sum + r.days_1_30, 0).toLocaleString()}</td>
                                <td>Ksh {generatedReport.data.reduce((sum, r) => sum + r.days_31_60, 0).toLocaleString()}</td>
                                <td>Ksh {generatedReport.data.reduce((sum, r) => sum + r.days_61_90, 0).toLocaleString()}</td>
                                <td>Ksh {generatedReport.data.reduce((sum, r) => sum + r.days_91_over, 0).toLocaleString()}</td>
                                <td className="text-gray-900">Ksh {generatedReport.data.reduce((sum, r) => sum + r.total, 0).toLocaleString()}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* DYNAMIC RENDER: BALANCE SHEET */}
                    {generatedReport.report === 'Balance Sheet' && (
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="bg-gray-50 border-b border-gray-200"><td className="py-2 px-2 font-bold text-gray-900"><span className="text-[10px]">▼</span> Assets</td><td className="text-right font-bold">Ksh {generatedReport.data.assets.total.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Cash on Hand</td><td className="text-right">Ksh {generatedReport.data.assets.cash.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Accounts Receivable</td><td className="text-right">Ksh {generatedReport.data.assets.accounts_receivable.toLocaleString()}</td></tr>
                          
                          <tr className="bg-gray-50 border-b border-gray-200 mt-4"><td className="py-2 px-2 font-bold text-gray-900"><span className="text-[10px]">▼</span> Liabilities & Equity</td><td className="text-right font-bold">Ksh {(generatedReport.data.liabilities.total + generatedReport.data.equity.total).toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Accounts Payable</td><td className="text-right">Ksh {generatedReport.data.liabilities.accounts_payable.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Retained Earnings / Net Income</td><td className="text-right">Ksh {generatedReport.data.equity.retained_earnings.toLocaleString()}</td></tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* STATIC LIVE DASHBOARD (FALLBACK) */}
                  <div className="flex gap-4 mb-6 border-b border-gray-200">
                    <button onClick={() => setReportTab('pnl')} className={`pb-3 px-2 text-sm font-semibold transition-all ${reportTab === 'pnl' ? 'text-[#2ca01c] border-b-[3px] border-[#2ca01c]' : 'text-gray-600 hover:text-gray-900'}`}>Profit and Loss (Live)</button>
                    <button onClick={() => setReportTab('balance-sheet')} className={`pb-3 px-2 text-sm font-semibold transition-all ${reportTab === 'balance-sheet' ? 'text-[#2ca01c] border-b-[3px] border-[#2ca01c]' : 'text-gray-600 hover:text-gray-900'}`}>Balance Sheet (Live)</button>
                    <button onClick={() => setReportTab('ar')} className={`pb-3 px-2 text-sm font-semibold transition-all ${reportTab === 'ar' ? 'text-[#2ca01c] border-b-[3px] border-[#2ca01c]' : 'text-gray-600 hover:text-gray-900'}`}>A/R Ageing (Live)</button>
                  </div>

                  {reportTab === 'pnl' && (
                    <div className="bg-white rounded border border-gray-200 shadow-sm p-10 max-w-4xl mx-auto font-sans opacity-70">
                      <div className="text-center border-b border-gray-300 pb-6 mb-2">
                        <h2 className="text-[17px] font-bold text-gray-900 uppercase tracking-wide">Parkview Mall</h2><p className="text-[13px] text-gray-600 mt-1">Profit and Loss</p><p className="text-[13px] text-gray-600">Year to Date (Live Estimates)</p>
                      </div>
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-300"><th></th><th className="py-2 text-right font-bold text-gray-900 flex items-center justify-end gap-1"><TrendingUp className="w-3 h-3"/> Total</th></tr></thead>
                        <tbody>
                          <tr className="bg-gray-50 border-b border-gray-200"><td className="py-2 px-2 font-bold text-gray-900 flex items-center gap-1"><span className="text-[10px]">▼</span> Income</td><td></td></tr>
                          <tr><td className="py-1.5 px-6 text-gray-700">ELECTRICITY BILL</td><td className="text-right">Ksh {getIncomeSum(['ELECTRICITY BILL', 'Electricity']).toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 px-6 text-gray-700">SERVICE CHARGE</td><td className="text-right">Ksh {getIncomeSum(['SERVICE CHARGE', 'Service Charge']).toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 px-6 text-gray-700">Rent & Services</td><td className="text-right">Ksh {getIncomeSum(['Rent', 'Services', 'Rent & Services']).toLocaleString()}</td></tr>
                          <tr className="border-y border-gray-300 font-bold bg-gray-50"><td className="py-2 px-2">Total for Income</td><td className="text-right">Ksh {grossRevenue.toLocaleString()}</td></tr>
                          <tr className="bg-gray-50 border-b border-gray-200 mt-4"><td className="py-2 px-2 font-bold text-gray-900 flex items-center gap-1 pt-4"><span className="text-[10px]">▼</span> Expenses</td><td></td></tr>
                          {['KPLC', 'LAND RENT', 'PAYROLL', 'SECURITY', 'SUPPLIERS'].map(c => ( <tr key={c}><td className="py-1.5 px-6 text-gray-700 capitalize">{c.toLowerCase()}</td><td className="text-right">Ksh {getExpenseSum([c]).toLocaleString()}</td></tr> ))}
                          <tr className="border-b border-gray-400 font-bold bg-gray-100"><td className="py-2 px-2">Total Expenses</td><td className="text-right">Ksh {totalExpenses.toLocaleString()}</td></tr>
                          <tr className="border-b-4 border-double border-gray-400 font-bold bg-gray-100"><td className="py-3 px-2">Net Earnings</td><td className="text-right">Ksh {netProfit.toLocaleString()}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {reportTab === 'balance-sheet' && (
                    <div className="bg-white rounded border border-gray-200 shadow-sm p-10 max-w-4xl mx-auto font-sans opacity-70">
                      <div className="text-center border-b border-gray-300 pb-6 mb-2">
                        <h2 className="text-[17px] font-bold text-gray-900 uppercase tracking-wide">Parkview Mall</h2><p className="text-[13px] text-gray-600 mt-1">Balance Sheet (Live Estimates)</p>
                      </div>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="bg-gray-50 border-b border-gray-200"><td className="py-2 px-2 font-bold text-gray-900"><span className="text-[10px]">▼</span> Assets</td><td className="text-right font-bold">Ksh {totalCurrentAssets.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Cash Operations Asset Base</td><td className="text-right">Ksh {simulatedCashAtBank.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Accounts Receivable Balance</td><td className="text-right">Ksh {totalAccountsReceivable.toLocaleString()}</td></tr>
                          <tr className="bg-gray-50 border-b border-gray-200"><td className="py-2 px-2 font-bold text-gray-900"><span className="text-[10px]">▼</span> Liabilities & Equity</td><td className="text-right font-bold">Ksh {(totalLiabilities + totalEquity).toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Accounts Payable Ledger</td><td className="text-right">Ksh {totalLiabilities.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Retained Operational Earnings</td><td className="text-right">Ksh {totalEquity.toLocaleString()}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {reportTab === 'ar' && (
                    <div className="bg-white rounded border border-gray-200 shadow-sm p-10 font-sans overflow-x-auto opacity-70">
                      <div className="text-center border-b border-gray-300 pb-6 mb-2">
                        <h2 className="text-[17px] font-bold text-gray-900 uppercase tracking-wide">Parkview Mall</h2><p className="text-[13px] text-gray-600 mt-1">A/R Ageing Summary (Live Estimates)</p>
                      </div>
                      <table className="w-full text-xs text-right whitespace-nowrap">
                        <thead><tr className="border-b border-gray-300 font-bold text-gray-900 uppercase"><th className="py-3 px-2 text-left">Tenant</th><th className="py-3 px-2">Current</th><th className="py-3 px-2">1 - 30</th><th className="py-3 px-2">31 - 60</th><th className="py-3 px-2">61 - 90</th><th className="py-3 px-2">91 and over</th><th className="py-3 px-2">Total</th></tr></thead>
                        <tbody>
                          {agingLedger.length === 0 ? ( <tr><td colSpan="7" className="py-8 text-center text-gray-500">All columns clear.</td></tr> ) : agingLedger.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="py-2 px-2 text-left text-gray-700">{row.entity}</td>
                              <td>{row.current ? `Ksh ${row.current.toLocaleString()}` : ''}</td>
                              <td>{row.d30 ? `Ksh ${row.d30.toLocaleString()}` : ''}</td>
                              <td>{row.d60 ? `Ksh ${row.d60.toLocaleString()}` : ''}</td>
                              <td>{row.d90 ? `Ksh ${row.d90.toLocaleString()}` : ''}</td>
                              <td>{row.over90 ? `Ksh ${row.over90.toLocaleString()}` : ''}</td>
                              <td className="font-semibold">Ksh {row.total.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ========================================== */}
      {/* MODAL MODULARS */}
      {/* ========================================== */}
      
      {/* 1. REPORT GENERATOR MODAL (NEW) */}
      {isReportModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-[#2ca01c]">
              <h3 className="font-bold text-white flex items-center"><BarChart3 className="w-5 h-5 mr-2" /> Generate Custom Report</h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-white/80 hover:text-white hover:bg-black/10 p-1 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleGenerateReport} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Report Type</label>
                <select name="type" value={reportForm.type} onChange={handleReportChange} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white outline-none cursor-pointer focus:border-[#2ca01c]">
                  <option value="Profit and Loss">Profit and Loss</option>
                  <option value="Balance Sheet">Balance Sheet</option>
                  <option value="AR Ageing Summary">A/R Ageing Summary</option>
                </select>
              </div>

              {reportForm.type === 'Profit and Loss' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Start Date</label>
                  <input type="date" name="start_date" required value={reportForm.start_date} onChange={handleReportChange} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2ca01c]" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{reportForm.type === 'Profit and Loss' ? 'End Date' : 'As Of Date'}</label>
                <input type="date" name="end_date" required value={reportForm.end_date} onChange={handleReportChange} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#2ca01c]" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsReportModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={loadingReport} className="flex-1 px-4 py-2.5 bg-[#2ca01c] text-white rounded-lg text-sm font-semibold hover:bg-[#238016] cursor-pointer disabled:opacity-50">
                  {loadingReport ? 'Compiling...' : 'Run Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PAYOUT REQUEST MODAL */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Create Payout Request</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 outline-none cursor-pointer">
                  <option value="Director Payout">Director Payout</option><option value="Salary">Salary Advance</option><option value="Legal">Legal Retainer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Amount (KES)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-medium text-sm">KES</span>
                  <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0.00" required className="w-full border border-gray-200 rounded-lg pl-12 pr-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Payout Method</label>
                <select name="payout_method" value={formData.payout_method} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 outline-none cursor-pointer">
                  <option value="Bank Wire">Bank Wire</option><option value="Bank Transfer">Bank Transfer</option><option value="Cheque">Cheque</option><option value="Mobile Money">Mobile Money (M-Pesa)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Reason / Description</label>
                <textarea name="reason" value={formData.reason} onChange={handleChange} rows="3" required placeholder="E.g., Monthly performance bonus..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:bg-white resize-none outline-none"></textarea>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 cursor-pointer">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. INVOICE PREVIEW MODAL */}
      {selectedInvoice && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#f8fafc] rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
              <h3 className="font-bold text-gray-900 text-base">Invoice INV-{selectedInvoice.id.toString().padStart(3, '0')}</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="flex justify-end mb-4">
                 <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm cursor-pointer"><Printer className="w-4 h-4" /> Print / Save as PDF</button>
              </div>
              <div className="bg-white p-10 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-8 mb-8">
                      <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-800 text-white rounded-xl flex items-center justify-center shadow-sm"><Building2 className="w-7 h-7" /></div>
                          <div><h2 className="text-xl font-bold text-gray-900 tracking-tight">Parkview Mall</h2><p className="text-sm text-gray-500">Property & Hospitality ERP</p></div>
                      </div>
                      <div className="text-right">
                          <h1 className="text-4xl font-black text-gray-900 tracking-tight">INVOICE</h1>
                          <p className="text-sm font-medium text-gray-500 mt-1">#INV-{selectedInvoice.id.toString().padStart(3, '0')}</p>
                      </div>
                  </div>
                  <table className="w-full text-left text-sm mb-8">
                      <thead><tr className="border-y-2 border-gray-100"><th className="py-4 font-bold text-gray-900">Description</th><th className="py-4 font-bold text-gray-900 text-right">Amount (KES)</th></tr></thead>
                      <tbody className="divide-y divide-gray-100"><tr><td className="py-5 text-gray-800 text-base">Monthly {selectedInvoice.category}</td><td className="py-5 text-gray-900 text-right font-semibold text-base">{selectedInvoice.amount.toLocaleString()}</td></tr></tbody>
                  </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
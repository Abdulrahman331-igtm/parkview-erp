import { useEffect, useState, useCallback } from 'react';
import { 
  Building2, LayoutDashboard, ReceiptText, DollarSign, 
  Search, FileText, Plus, TrendingUp, X, CheckCircle2, 
  AlertTriangle, Eye, Printer, TrendingDown, Users, Briefcase, Lock,
  PanelLeft, Clock, ChevronDown, ArrowUpRight, ArrowDownRight, LogOut
} from 'lucide-react';

// --- ESTEBAN'S REPORT DATE ENGINE ---
const PERIOD_OPTIONS = [
  "Last 30 days", "This month", "This month to date", 
  "This fiscal quarter", "This fiscal quarter to date", 
  "This financial year", "This financial year to date", 
  "Last month", "Last fiscal quarter", "Last financial year"
];

const REPORT_PERIOD_OPTIONS = ["Custom", ...PERIOD_OPTIONS];

const getPresetDates = (period) => {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  const formatDate = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  let start, end;

  switch (period) {
    case "Last 30 days": start = new Date(); start.setDate(start.getDate() - 30); end = new Date(); break;
    case "This month": start = new Date(y, m, 1); end = new Date(y, m + 1, 0); break;
    case "This month to date": start = new Date(y, m, 1); end = new Date(); break;
    case "This fiscal quarter": const q = Math.floor(m / 3); start = new Date(y, q * 3, 1); end = new Date(y, q * 3 + 3, 0); break;
    case "This fiscal quarter to date": const qtd = Math.floor(m / 3); start = new Date(y, qtd * 3, 1); end = new Date(); break;
    case "This financial year": start = new Date(y, 0, 1); end = new Date(y, 11, 31); break;
    case "This financial year to date": start = new Date(y, 0, 1); end = new Date(); break;
    case "Last month": start = new Date(y, m - 1, 1); end = new Date(y, m, 0); break;
    case "Last fiscal quarter": const lq = Math.floor(m / 3) - 1; start = new Date(y, lq * 3, 1); end = new Date(y, lq * 3 + 3, 0); break;
    case "Last financial year": start = new Date(y - 1, 0, 1); end = new Date(y - 1, 11, 31); break;
    default: return null;
  }
  return { start: formatDate(start), end: formatDate(end) };
};

export default function App() {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // UPDATED: Replaced 'email' with 'username' to perfectly match your Pydantic LoginRequest schema
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [userRole, setUserRole] = useState(null);
  const [activeUser, setActiveUser] = useState("Director");

  // --- NAVIGATION STATE ---
  const [currentView, setCurrentView] = useState('dashboard');

  // --- WIDGET TIMELINE STATE ---
  const [plPeriod, setPlPeriod] = useState("This month");
  const [expPeriod, setExpPeriod] = useState("This month");
  const [salesPeriod, setSalesPeriod] = useState("This month");
  const [arPeriod, setArPeriod] = useState("This month");
  const [apPeriod, setApPeriod] = useState("This month");

  // --- GLOBAL DATA STATE ---
  const [dashboardData, setDashboardData] = useState(null);
  
  const [payouts, setPayouts] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  
  const [invoices, setInvoices] = useState([]); 
  const [invoiceSummary, setInvoiceSummary] = useState(null);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  const [expenses, setExpenses] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);

  // --- MODAL STATE ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All Categories');
  
  const [formData, setFormData] = useState({ category: 'Director Payout', amount: '', payout_method: 'Bank Wire', reason: '' });

  // --- REPORT GENERATOR STATE ---
  const [loadingReport, setLoadingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [reportType, setReportType] = useState("Profit and Loss");
  const [accountingMethod, setAccountingMethod] = useState("Cash");
  const [reportPeriodSelect, setReportPeriodSelect] = useState("This financial year to date");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");

  // Check for existing token on load
  useEffect(() => {
    const token = localStorage.getItem('parkview_token');
    const role = localStorage.getItem('parkview_role');
    const name = localStorage.getItem('parkview_username');
    if (token) {
      setIsAuthenticated(true);
      if (role) setUserRole(role);
      if (name) setActiveUser(name);
    }
  }, []);

  useEffect(() => {
    const dates = getPresetDates("This financial year to date");
    if (dates) {
      setReportStartDate(dates.start);
      setReportEndDate(dates.end);
    }
  }, []);

  // --- API FETCH ENGINE ---
  const fetchAPI = async (endpoint, method = 'GET', body = null) => {
    const token = localStorage.getItem('parkview_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const options = { method, headers, cache: 'no-store' };
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`http://127.0.0.1:8000/api/v1${endpoint}`, options);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const loadAllData = useCallback(async () => {
    try {
      const dashData = await fetchAPI(`/dashboard/main-summary?pl_period=${encodeURIComponent(plPeriod)}&exp_period=${encodeURIComponent(expPeriod)}&sales_period=${encodeURIComponent(salesPeriod)}&ar_period=${encodeURIComponent(arPeriod)}&ap_period=${encodeURIComponent(apPeriod)}`);
      setDashboardData(dashData);

      const payData = await fetchAPI('/director/payouts');
      setPayouts(payData);
      setLoadingPayouts(false);

      const invData = await fetchAPI('/invoices/dashboard-summary');
      setInvoices(invData.invoices || []);
      setInvoiceSummary(invData.summary);
      setLoadingInvoices(false);

      const expData = await fetchAPI('/expenses/dashboard-summary');
      setExpenses(expData.expenses || []);
      setExpenseSummary(expData.summary);

    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  }, [plPeriod, expPeriod, salesPeriod, arPeriod, apPeriod]);

  // LIVE BACKGROUND POLLING (Every 15 Seconds)
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData(); // Initial load
      
      const backgroundSync = setInterval(() => {
        loadAllData();
      }, 15000); 

      return () => clearInterval(backgroundSync);
    }
  }, [isAuthenticated, loadAllData]);

  // --- FORM INPUT HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStartDateChange = (e) => setReportStartDate(e.target.value);
  const handleEndDateChange = (e) => setReportEndDate(e.target.value);

  // --- AUTH HANDLERS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Connects precisely to the new login_for_access_token endpoint
      const data = await fetchAPI('/login', 'POST', { 
        username: loginForm.username, 
        password: loginForm.password 
      });
      
      if (data.access_token) { 
        localStorage.setItem('parkview_token', data.access_token); 
        localStorage.setItem('parkview_role', data.role);
        localStorage.setItem('parkview_username', data.name);
        setUserRole(data.role); 
        setActiveUser(data.name);
        setIsAuthenticated(true); 
      }
    } catch (error) { alert("Invalid credentials or server offline. Please check your username and password."); }
  };

  const handleLogout = () => {
    localStorage.removeItem('parkview_token');
    localStorage.removeItem('parkview_role');
    localStorage.removeItem('parkview_username');
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setLoginForm({ username: '', password: '' });
  };

  // --- PAYOUT HANDLER (The ONLY Write Operation Allowed for Director) ---
  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetchAPI('/director/payouts', 'POST', { 
        category: formData.category, 
        amount: parseFloat(formData.amount || 0), 
        payout_method: formData.payout_method, 
        reason: formData.reason 
      });
      loadAllData(); 
      setIsPayoutModalOpen(false);
      setFormData({ category: 'Director Payout', amount: '', payout_method: 'Bank Wire', reason: '' });
      alert("Payout Request successfully recorded.");
    } catch (error) { alert("Failed to submit request."); }
  };

  // --- REPORT GENERATOR ---
  const handleReportPeriodChange = (e) => {
    const selected = e.target.value;
    setReportPeriodSelect(selected);
    if (selected !== "Custom") {
      const dates = getPresetDates(selected);
      if (dates) {
        setReportStartDate(dates.start);
        setReportEndDate(dates.end);
      }
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setLoadingReport(true);
    try {
      let url = `http://127.0.0.1:8000/api/v1/reports/generate?type=${encodeURIComponent(reportType)}&accounting_method=${accountingMethod}`;
      
      if (reportEndDate) url += `&end_date=${reportEndDate}`;
      if (reportType !== "AR Ageing Summary" && reportStartDate) {
          url += `&start_date=${reportStartDate}`;
      }

      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('parkview_token')}` } });
      if (res.ok) {
        const data = await res.json();
        setGeneratedReport(data);
        setIsReportModalOpen(false);
      } else { 
        const errorData = await res.json();
        alert(`Failed: ${errorData.detail || "Server error"}`); 
      }
    } catch (error) { alert("Could not connect to report engine."); } 
    finally { setLoadingReport(false); }
  };

  // --- FILTERING LOGIC ---
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'All Status' || inv?.status === statusFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (inv?.entity_name || '').toLowerCase().includes(searchLower) || (inv?.unit_number || '').toLowerCase().includes(searchLower) || (inv?.invoice_code || '').toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const expenseCategories = ['All Categories', ...new Set(expenses.map(e => e?.category).filter(Boolean))];
  const filteredExpenses = expenses.filter((e) => expenseCategoryFilter === 'All Categories' || e?.category === expenseCategoryFilter);

  // --- HELPER RENDERERS ---
  const renderStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'paid') return <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-sm">Paid</span>;
    if (s === 'overdue') return <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-red-500 text-white shadow-sm">Overdue</span>;
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500 text-white shadow-sm">Pending</span>;
  };

  // ==========================================
  // RENDER: SECURE ENTRANCE
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans antialiased relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-96 bg-[#1e293b] -skew-y-2 origin-top-left -z-10"></div>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-500">
          <div className="p-8 pb-6 text-center border-b border-gray-100">
            <img src="/logo.png" alt="Park View Mall Logo" className="w-16 h-16 mx-auto mb-4 object-contain" onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=PV&background=3b82f6&color=fff&rounded=true&bold=true&size=128"; }} />
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Director Portal</h2>
            <p className="text-sm text-gray-500 mt-1">Park View Mall ERP</p>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Username</label>
              <input type="text" required value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} placeholder="e.g. director_jm" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 bg-gray-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Password</label>
              <input type="password" required value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} placeholder="••••••••" className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 bg-gray-50 focus:bg-white" />
            </div>
            {/* Note: Purposely omitting any registration links to maintain strict access control */}
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md cursor-pointer"><Lock className="w-4 h-4" /> Secure Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  // --- API EXTRACTED DATA SAFE FALLBACKS ---
  const pl = dashboardData?.profit_and_loss || { net_profit: 0, trend_is_up: true, trend_percentage: 0, income: 0, expenses: 0 };
  const exp = dashboardData?.expenses_overview || { total_spending: 0, trend_is_up: false, trend_percentage: 0, breakdown: [] };
  const sales = dashboardData?.sales || { total: 0, chart_data: [] };
  const ar = dashboardData?.accounts_receivable || { total_outstanding: 0, current: 0, overdue: 0 };
  const ap = dashboardData?.accounts_payable || { total_owed: 0, current: 0, overdue: 0 };

  // SVG Chart Computations
  const incomeBarWidth = `${Math.min((pl.income / (pl.income + pl.expenses || 1)) * 100, 100)}%`;
  const expensesBarWidth = `${Math.min((pl.expenses / (pl.income + pl.expenses || 1)) * 100, 100)}%`;

  let cumulativePercent = 0;
  const donutStops = exp.breakdown.map((item) => {
    const start = cumulativePercent;
    cumulativePercent += item.percentage;
    return `${item.color} ${start}% ${cumulativePercent}%`;
  }).join(", ") || "#e2e8f0 0% 100%";

  const chartHeight = 120; const chartWidth = 400; const paddingX = 30; const paddingY = 20;
  const maxSales = Math.max(...sales.chart_data.map(d => d.amount), 1000); 
  const yAxisMax = Math.ceil(maxSales / 1000000) * 1000000;
  const svgPoints = sales.chart_data.map((d, i) => {
    const x = paddingX + (i * ((chartWidth - paddingX * 2) / Math.max(sales.chart_data.length - 1, 1)));
    const y = chartHeight - paddingY - ((d.amount / yAxisMax) * (chartHeight - paddingY * 2));
    return `${x},${y}`;
  }).join(" ");

  const pendingPayoutsCount = payouts.filter(p => p?.status === 'Pending').length;
  const approvedPayoutsCount = payouts.filter(p => p?.status === 'Approved').length; 
  const paidPayoutsSum = payouts.filter(p => p?.status === 'Paid').reduce((sum, p) => sum + (p?.amount || 0), 0);

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-sm antialiased relative">
      
      {/* GLOBAL SIDEBAR */}
      <aside className="w-64 bg-[#1e293b] text-gray-300 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 mt-4 mb-4">
          <img src="/logo.png" alt="Park View Mall Logo" className="w-10 h-10 rounded mr-3 object-contain bg-white/10 p-1" onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=PV&background=3b82f6&color=fff&rounded=true&bold=true"; }} />
          <div><h1 className="text-white font-bold text-base tracking-tight">Park View Mall</h1><p className="text-[10px] text-gray-400 font-medium tracking-wide">Mall Operations ERP</p></div>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <button onClick={() => {setCurrentView('dashboard'); setGeneratedReport(null);}} className={`w-full flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${currentView === 'dashboard' ? 'bg-[#2a364a] text-blue-400' : 'hover:bg-[#2a364a]/50 text-gray-400 hover:text-gray-200'}`}><LayoutDashboard className="w-4 h-4 mr-3" /> Dashboard</button>
          <button onClick={() => {setCurrentView('invoices'); setGeneratedReport(null);}} className={`w-full flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${currentView === 'invoices' ? 'bg-[#2a364a] text-blue-400' : 'hover:bg-[#2a364a]/50 text-gray-400 hover:text-gray-200'}`}><ReceiptText className="w-4 h-4 mr-3" /> Invoices</button>
          <button onClick={() => {setCurrentView('expenses'); setGeneratedReport(null);}} className={`w-full flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${currentView === 'expenses' ? 'bg-[#2a364a] text-blue-400' : 'hover:bg-[#2a364a]/50 text-gray-400 hover:text-gray-200'}`}><DollarSign className="w-4 h-4 mr-3" /> Expenses</button>
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
            <span className="px-3 py-1 bg-emerald-500 text-white text-[11px] font-bold rounded-full uppercase">{userRole || 'Director'}</span>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs uppercase">{activeUser.substring(0, 2)}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          
          {/* ========================================================= */}
          {/* VIEW 1: DASHBOARD */}
          {/* ========================================================= */}
          {currentView === 'dashboard' && (
            <div className="animate-in fade-in duration-300 max-w-7xl space-y-6">
              
              {/* RENDER REPORT OVERLAY IF ACTIVE */}
              {generatedReport ? (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <div className="mb-4 flex justify-between items-center max-w-4xl mx-auto">
                    <button onClick={() => setGeneratedReport(null)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center"><ChevronDown className="w-4 h-4 mr-1 rotate-90"/> Back to Dashboard</button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 shadow-sm cursor-pointer"><Printer className="w-4 h-4" /> Print</button>
                  </div>
                  
                  <div className="bg-white rounded border border-gray-200 shadow-sm p-10 max-w-4xl mx-auto font-sans print:shadow-none print:border-none">
                    <div className="text-center border-b border-gray-300 pb-6 mb-2">
                      <h2 className="text-[17px] font-bold text-gray-900 uppercase tracking-wide">Park View Mall</h2>
                      <p className="text-[13px] text-gray-600 mt-1">{generatedReport.report}</p>
                      <p className="text-[13px] text-gray-600">{generatedReport.period || `As of ${generatedReport.as_of}`}</p>
                    </div>

                    {/* DYNAMIC P&L RENDERING */}
                    {generatedReport.report.includes('Profit and Loss') && (
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-300"><th></th><th className="py-2 text-right font-bold text-gray-900 flex items-center justify-end gap-1"><TrendingUp className="w-3 h-3"/> Total</th></tr></thead>
                        <tbody>
                          <tr className="bg-gray-50 border-b border-gray-200"><td className="py-2 px-2 font-bold text-gray-900 flex items-center gap-1"><span className="text-[10px]">▼</span> Income</td><td></td></tr>
                          {generatedReport.data.income.map(item => (<tr key={item.account}><td className="py-1.5 px-6 text-gray-700 uppercase">{item.account}</td><td className="text-right">KES {item.amount.toLocaleString()}</td></tr>))}
                          <tr className="border-y border-gray-300 font-bold bg-gray-50"><td className="py-2 px-2">Total for Income</td><td className="text-right">KES {generatedReport.data.total_income.toLocaleString()}</td></tr>
                          
                          <tr className="bg-gray-50 border-b border-gray-200 mt-4"><td className="py-2 px-2 font-bold text-gray-900 flex items-center gap-1 pt-4"><span className="text-[10px]">▼</span> Expenses</td><td></td></tr>
                          {generatedReport.data.expenses.map(item => (<tr key={item.account}><td className="py-1.5 px-6 text-gray-700 uppercase">{item.account}</td><td className="text-right">KES {item.amount.toLocaleString()}</td></tr>))}
                          <tr className="border-y border-gray-300 font-bold bg-gray-50"><td className="py-2 px-2">Total for Expenses</td><td className="text-right">KES {generatedReport.data.total_expenses.toLocaleString()}</td></tr>
                          <tr className="border-b-4 border-double border-gray-400 font-bold bg-gray-100"><td className="py-3 px-2">Net Earnings</td><td className="text-right">KES {generatedReport.data.net_earnings.toLocaleString()}</td></tr>
                        </tbody>
                      </table>
                    )}

                    {/* DYNAMIC A/R AGEING RENDERING */}
                    {generatedReport.report.includes('A/R Ageing') && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-right whitespace-nowrap">
                          <thead><tr className="border-b border-gray-300 font-bold text-gray-900 uppercase"><th className="py-3 px-2 text-left">Tenant</th><th className="py-3 px-2">Current</th><th className="py-3 px-2">1 - 30</th><th className="py-3 px-2">31 - 60</th><th className="py-3 px-2">61 - 90</th><th className="py-3 px-2">91 and over</th><th className="py-3 px-2">Total</th></tr></thead>
                          <tbody className="divide-y divide-gray-200">
                            {generatedReport.data.length === 0 ? ( <tr><td colSpan="7" className="py-8 text-center text-gray-500">All accounts settled.</td></tr> ) : generatedReport.data.map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50"><td className="py-2 px-2 text-left text-gray-700">{row.client}</td><td>{row.current ? `KES ${row.current.toLocaleString()}` : ''}</td><td>{row.days_1_30 ? `KES ${row.days_1_30.toLocaleString()}` : ''}</td><td>{row.days_31_60 ? `KES ${row.days_31_60.toLocaleString()}` : ''}</td><td>{row.days_61_90 ? `KES ${row.days_61_90.toLocaleString()}` : ''}</td><td>{row.days_91_over ? `KES ${row.days_91_over.toLocaleString()}` : ''}</td><td className="font-semibold text-gray-900">KES {row.total.toLocaleString()}</td></tr>
                            ))}
                            {/* GRAND TOTALS ROW */}
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                              <td className="py-3 px-2 text-left text-gray-900">GRAND TOTAL</td>
                              <td>KES {generatedReport.totals?.current.toLocaleString()}</td>
                              <td>KES {generatedReport.totals?.days_1_30.toLocaleString()}</td>
                              <td>KES {generatedReport.totals?.days_31_60.toLocaleString()}</td>
                              <td>KES {generatedReport.totals?.days_61_90.toLocaleString()}</td>
                              <td>KES {generatedReport.totals?.days_91_over.toLocaleString()}</td>
                              <td className="text-blue-700">KES {generatedReport.totals?.grand_total.toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* DYNAMIC BALANCE SHEET RENDERING */}
                    {generatedReport.report.includes('Balance Sheet') && (
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="bg-gray-50 border-b border-gray-200"><td className="py-2 px-2 font-bold text-gray-900"><span className="text-[10px]">▼</span> Assets</td><td className="text-right font-bold">KES {generatedReport.data.assets.total.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Cash on Hand</td><td className="text-right">KES {generatedReport.data.assets.cash.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Accounts Receivable</td><td className="text-right">KES {generatedReport.data.assets.accounts_receivable.toLocaleString()}</td></tr>
                          
                          <tr className="bg-gray-50 border-b border-gray-200 mt-4"><td className="py-2 px-2 font-bold text-gray-900"><span className="text-[10px]">▼</span> Liabilities</td><td className="text-right font-bold">KES {generatedReport.data.liabilities.total.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Accounts Payable</td><td className="text-right">KES {generatedReport.data.liabilities.accounts_payable.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Bank Loans</td><td className="text-right">KES {generatedReport.data.liabilities.bank_loans.toLocaleString()}</td></tr>

                          <tr className="bg-gray-50 border-b border-gray-200 mt-4"><td className="py-2 px-2 font-bold text-gray-900"><span className="text-[10px]">▼</span> Equity</td><td className="text-right font-bold">KES {generatedReport.data.equity.total.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Retained Earnings / Net Income</td><td className="text-right">KES {generatedReport.data.equity.retained_earnings.toLocaleString()}</td></tr>
                          <tr><td className="py-1.5 pl-10 text-gray-700">Invested Capital</td><td className="text-right">KES {generatedReport.data.equity.invested_capital.toLocaleString()}</td></tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* DEFAULT DASHBOARD VIEW */}
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Business at a glance</h2>
                    <div className="flex gap-3">
                      <button onClick={() => setIsPayoutModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow text-sm flex items-center gap-2 transition-colors cursor-pointer"><Plus size={16}/> Request Payout</button>
                      <button onClick={() => setIsReportModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow text-sm flex items-center gap-2 transition-colors cursor-pointer"><FileText size={16}/> Generate Report</button>
                    </div>
                  </div>

                  {!dashboardData ? (
                    <div className="text-gray-500 animate-pulse font-medium">Loading summary calculations from database...</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* CARD 1: PROFIT & LOSS */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profit & Loss</h2>
                            <div className="relative inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer hover:text-slate-900">
                              <select value={plPeriod} onChange={(e) => setPlPeriod(e.target.value)} className="appearance-none bg-transparent pr-4 outline-none cursor-pointer z-10 relative">
                                {PERIOD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-0 top-0.5 text-slate-500 z-0" />
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 font-medium mb-1">Net profit</p>
                          <div className="flex items-center gap-3 mb-2"><h3 className="text-4xl font-bold text-slate-900 tracking-tight">Ksh {pl.net_profit.toLocaleString()}</h3></div>
                          <p className={`text-sm font-semibold flex items-center gap-1 mb-6 ${pl.trend_is_up ? 'text-green-600' : 'text-red-600'}`}>{pl.trend_is_up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />} {pl.trend_is_up ? "Up" : "Down"} {pl.trend_percentage}% <span className="text-slate-500 font-normal">from previous period</span></p>
                          <div className="mb-4">
                            <p className="text-sm font-bold text-slate-900">Ksh {pl.income.toLocaleString()}</p>
                            <p className="text-xs text-slate-500 mb-1">Income</p>
                            <div className="w-full bg-slate-100 h-6 rounded-sm overflow-hidden flex"><div className="bg-green-500 h-full transition-all duration-500" style={{ width: incomeBarWidth }}></div></div>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Ksh {pl.expenses.toLocaleString()}</p>
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
                                {PERIOD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-0 top-0.5 text-slate-500 z-0" />
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 font-medium mb-1">Spending</p>
                          <div className="flex items-center gap-3 mb-2"><h3 className="text-4xl font-bold text-slate-900 tracking-tight">Ksh {exp.total_spending.toLocaleString()}</h3></div>
                          <p className={`text-sm font-semibold flex items-center gap-1 mb-8 ${exp.trend_is_up ? 'text-red-600' : 'text-green-600'}`}>{exp.trend_is_up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />} {exp.trend_is_up ? "Up" : "Down"} {exp.trend_percentage}% <span className="text-slate-500 font-normal">from previous period</span></p>
                          <div className="flex items-center gap-8">
                            <div className="w-32 h-32 rounded-full relative shadow-sm shrink-0" style={{ background: `conic-gradient(${donutStops})` }}><div className="absolute inset-0 m-auto w-16 h-16 bg-white rounded-full"></div></div>
                            <div className="flex-1 space-y-3">
                              {exp.breakdown.slice(0, 4).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div><span className="font-bold text-slate-700 truncate w-20">{item.name}</span></div>
                                  <span className="font-semibold text-slate-900">{item.amount.toLocaleString()}</span>
                                  <span className="text-slate-500 font-medium">{item.percentage}%</span>
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
                                {PERIOD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-0 top-0.5 text-slate-500 z-0" />
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 font-medium mb-1">Total Accounted</p>
                          <div className="flex items-center gap-3 mb-6"><h3 className="text-4xl font-bold text-slate-900 tracking-tight">Ksh {sales.total.toLocaleString()}</h3></div>
                          <div className="w-full relative mt-2 text-xs font-medium text-slate-500">
                            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="#e2e8f0" strokeWidth="1" />
                              <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="#e2e8f0" strokeWidth="1" />
                              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="#94a3b8" strokeWidth="1" />
                              <text x={paddingX - 10} y={paddingY + 4} textAnchor="end" fill="#64748b" fontSize="10">{(yAxisMax / 1000000).toFixed(0)}M</text>
                              <text x={paddingX - 10} y={(chartHeight / 2) + 4} textAnchor="end" fill="#64748b" fontSize="10">{((yAxisMax / 2) / 1000000).toFixed(1)}M</text>
                              <text x={paddingX - 10} y={chartHeight - paddingY + 4} textAnchor="end" fill="#64748b" fontSize="10">0</text>
                              {sales.chart_data.length > 0 && (<polyline points={svgPoints} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round" />)}
                              {sales.chart_data.map((d, i) => {
                                const x = paddingX + (i * ((chartWidth - paddingX * 2) / Math.max(sales.chart_data.length - 1, 1)));
                                const y = chartHeight - paddingY - ((d.amount / yAxisMax) * (chartHeight - paddingY * 2));
                                return ( <g key={i}><circle cx={x} cy={y} r="3" fill="#16a34a" stroke="white" strokeWidth="1" /><text x={x} y={chartHeight} textAnchor="middle" fill="#64748b" fontSize="10">{d.month}</text></g> );
                              })}
                            </svg>
                            <div className="flex justify-end mt-4">
                              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                <div className="w-3 h-1 bg-green-600 rounded-full"></div> Amount
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* CARD 4: DOUBLE RECEIVABLE MATRIX */}
                        <div className="grid grid-cols-1 gap-6">
                          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Accounts Receivable</h2>
                                <div className="relative inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer hover:text-slate-900">
                                  <select value={arPeriod} onChange={(e) => setArPeriod(e.target.value)} className="appearance-none bg-transparent pr-4 outline-none cursor-pointer z-10 relative">
                                    {PERIOD_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                                  </select>
                                  <ChevronDown size={14} className="absolute right-0 top-0.5 text-slate-500 z-0" />
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 font-medium mb-1">Unpaid balances</p>
                              <h3 className="text-2xl font-bold text-slate-900">Ksh {ar.total_outstanding.toLocaleString()}</h3>
                            </div>
                            <div className="mt-6 flex h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(ar.current / (ar.total_outstanding || 1)) * 100}%`}}></div>
                              <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${(ar.overdue / (ar.total_outstanding || 1)) * 100}%`}}></div>
                            </div>
                            <div className="flex gap-4 mt-3 text-xs font-medium">
                              <div className="flex items-center gap-1.5 text-slate-600"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Current</div>
                              <div className="flex items-center gap-1.5 text-slate-600"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Overdue</div>
                            </div>
                          </div>
                          
                          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expenses (A/P)</h2>
                                <div className="relative inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer hover:text-slate-900">
                                  <select value={apPeriod} onChange={(e) => setApPeriod(e.target.value)} className="appearance-none bg-transparent pr-4 outline-none cursor-pointer z-10 relative">
                                    {PERIOD_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                                  </select>
                                  <ChevronDown size={14} className="absolute right-0 top-0.5 text-slate-500 z-0" />
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 font-medium mb-1">Unpaid bills</p>
                              <h3 className="text-2xl font-bold text-slate-900">Ksh {ap.total_owed.toLocaleString()}</h3>
                            </div>
                            <div className="mt-6 flex h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${(ap.current / (ap.total_owed || 1)) * 100}%`}}></div>
                              <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${(ap.overdue / (ap.total_owed || 1)) * 100}%`}}></div>
                            </div>
                            <div className="flex gap-4 mt-3 text-xs font-medium">
                              <div className="flex items-center gap-1.5 text-slate-600"><div className="w-2 h-2 rounded-full bg-cyan-500"></div> Current Owed</div>
                              <div className="flex items-center gap-1.5 text-slate-600"><div className="w-2 h-2 rounded-full bg-red-500"></div> Overdue Terms</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* THE RESTORED PAYOUT MANAGER MATRIX */}
                      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex justify-between items-center mb-6">
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-gray-500 mt-1" />
                            <div><h3 className="text-lg font-bold text-gray-900">Payout Requests</h3><p className="text-xs text-gray-500 mt-0.5">Track and post distribution pipelines.</p></div>
                          </div>
                          <button onClick={() => setIsPayoutModalOpen(true)} className="inline-flex items-center bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"><Plus className="w-4 h-4 mr-1.5" /> New Request</button>
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
                                <tr key={row.id} className="hover:bg-slate-50/50">
                                  <td className="py-3 px-4 font-medium text-gray-900">#PR-{row.id.toString().padStart(3, '0')}</td>
                                  <td className="py-3 px-4 text-gray-500">{row.date || row.created_at || row.request_date || "Just now"}</td>
                                  <td className="py-3 px-4 font-semibold text-gray-900">KES {row.amount.toLocaleString()}</td>
                                  <td className="py-3 px-4 text-gray-600">{row.payout_method}</td>
                                  <td className="py-3 px-4 text-right">{renderStatusBadge(row.status)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
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

              {!invoiceSummary ? (
                <div className="text-gray-500 animate-pulse font-medium">Loading invoices from database...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                      <div><p className="text-sm text-gray-500 mb-1">Total Invoices</p><h3 className="text-3xl font-bold text-gray-900">{invoiceSummary.total_invoices}</h3></div>
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><ReceiptText className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                      <div><p className="text-sm text-gray-500 mb-1">Paid</p><h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {invoiceSummary.paid_amount.toLocaleString()}</h3></div>
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                      <div><p className="text-sm text-gray-500 mb-1">Pending</p><h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {invoiceSummary.pending_amount.toLocaleString()}</h3></div>
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                      <div><p className="text-sm text-gray-500 mb-1">Overdue</p><h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {invoiceSummary.overdue_amount.toLocaleString()}</h3></div>
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
                    </div>
                  </div>

                  {invoiceSummary.follow_up_count > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-start gap-4">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-red-900">Outstanding Balance: KES {invoiceSummary.outstanding_balance.toLocaleString()}</h4>
                        <p className="text-sm text-red-700/80 mt-0.5">{invoiceSummary.follow_up_count} invoices require follow-up</p>
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
                          {filteredInvoices.length === 0 ? ( <tr><td colSpan="8" className="py-8 text-center text-gray-400">Empty workspace matches.</td></tr> ) : filteredInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/50">
                              <td className="py-4 font-semibold text-gray-900">{inv.invoice_code}</td>
                              <td className="py-4"><p className="font-semibold text-gray-900">{inv.entity_name}</p><p className="text-[11px] text-gray-500">{inv.entity_type}</p></td>
                              <td className="py-4 text-gray-600">{inv.unit_number}</td>
                              <td className="py-4"><span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium border border-gray-200 text-gray-600 bg-white">{inv.category}</span></td>
                              <td className="py-4 font-bold text-gray-900">KES {inv.amount.toLocaleString()}</td>
                              <td className="py-4 text-gray-600">{inv.due_date}</td>
                              <td className="py-4">{renderStatusBadge(inv.status)}</td>
                              <td className="py-4 text-center">
                                <button onClick={() => setSelectedInvoice(inv)} className="text-gray-500 hover:text-blue-600 cursor-pointer"><Eye className="w-5 h-5 mx-auto" /></button>
                              </td>
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

          {/* ======================================================== */}
          {/* VIEW 3: EXPENSES MODULE */}
          {/* ======================================================== */}
          {currentView === 'expenses' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-7xl">
              <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Expenses & Payouts</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Building-wide expenses, salaries, wages, and director payouts</p>
              </div>

              {!expenseSummary ? (
                <div className="text-gray-500 animate-pulse font-medium">Loading expenses from database...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                      <div><p className="text-sm text-gray-500 mb-1">Total Paid Expenses</p><h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {expenseSummary.total_expenses.toLocaleString()}</h3></div>
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><TrendingDown className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                      <div><p className="text-sm text-gray-500 mb-1">Salaries & Wages</p><h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {expenseSummary.salaries_wages.toLocaleString()}</h3></div>
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Users className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                      <div><p className="text-sm text-gray-500 mb-1">Procurement</p><h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {expenseSummary.procurement.toLocaleString()}</h3></div>
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Briefcase className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
                      <div><p className="text-sm text-gray-500 mb-1">Director Payouts</p><h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {expenseSummary.director_payouts.toLocaleString()}</h3></div>
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
                      <select value={expenseCategoryFilter} onChange={(e) => setExpenseCategoryFilter(e.target.value)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 bg-white outline-none cursor-pointer">
                        {expenseCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                      </select>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-white">
                          <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500"><th className="px-6 py-4">Code</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Recurring</th><th className="px-6 py-4 text-right">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredExpenses.length === 0 ? ( <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-400">No layout structures found.</td></tr> ) : filteredExpenses.map((exp) => (
                            <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-900">{exp.expense_code}</td>
                              <td className="px-6 py-4"><span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#2563eb] text-white shadow-sm">{exp.category}</span></td>
                              <td className="px-6 py-4 text-gray-800">{exp.description || 'No description provided.'}</td>
                              <td className="px-6 py-4 font-bold text-gray-900">KES {exp.amount.toLocaleString()}</td>
                              <td className="px-6 py-4 text-gray-600">{exp.date}</td>
                              <td className="px-6 py-4"><span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium border border-gray-200 text-gray-600 bg-white">{exp.recurring}</span></td>
                              <td className="px-6 py-4 text-right">{renderStatusBadge(exp.status)}</td>
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

        </main>
      </div>

      {/* ========================================== */}
      {/* MODAL MODULARS */}
      {/* ========================================== */}
      
      {/* 1. REPORT GENERATOR MODAL */}
      {isReportModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" /> Export Financial Report
              </h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"><X size={18} /></button>
            </div>
            <form onSubmit={handleGenerateReport} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Report Type</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 cursor-pointer">
                  <option value="Profit and Loss">Profit and Loss (P&L)</option>
                  <option value="AR Ageing Summary">A/R Ageing Summary</option>
                  <option value="Balance Sheet">Balance Sheet</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Report period</label>
                  <select value={reportPeriodSelect} onChange={handleReportPeriodChange} className="w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:border-blue-500 cursor-pointer text-slate-700">
                    {REPORT_PERIOD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">From</label>
                    <input type="date" required value={reportStartDate} onChange={handleStartDateChange} disabled={reportType === "AR Ageing Summary"} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">To</label>
                    <input type="date" required value={reportEndDate} onChange={handleEndDateChange} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Accounting method</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium w-full border border-slate-200">
                    <button type="button" onClick={() => setAccountingMethod("Cash")} className={`w-1/2 py-1 rounded transition-colors ${accountingMethod === "Cash" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-500 hover:text-slate-700 cursor-pointer"}`}>Cash</button>
                    <button type="button" onClick={() => setAccountingMethod("Accrual")} className={`w-1/2 py-1 rounded transition-colors ${accountingMethod === "Accrual" ? "bg-white shadow-sm text-slate-900 font-bold" : "text-slate-500 hover:text-slate-700 cursor-pointer"}`}>Accrual</button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-2">
                <button type="button" onClick={() => setIsReportModalOpen(false)} className="px-4 py-2 border text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={loadingReport} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium shadow cursor-pointer">{loadingReport ? "Compiling..." : "Run Report"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PAYOUT REQUEST MODAL (Only CRUD Allowed) */}
      {isPayoutModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Create Payout Request</h3>
              <button onClick={() => setIsPayoutModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handlePayoutSubmit} className="p-6 space-y-4">
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
                <button type="button" onClick={() => setIsPayoutModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 cursor-pointer">Cancel</button>
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
              <h3 className="font-bold text-gray-900 text-base">Invoice {selectedInvoice.invoice_code}</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="flex justify-end gap-3 mb-4">
                 <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm cursor-pointer"><Printer className="w-4 h-4" /> Print PDF</button>
              </div>
              <div className="bg-white p-10 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-8 mb-8">
                      <div className="flex items-center gap-4">
                          <img src="/logo.png" alt="Mall Logo" className="w-14 h-14 object-contain" onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=PV&background=1e293b&color=fff&rounded=true&bold=true"; }} />
                          <div><h2 className="text-xl font-bold text-gray-900 tracking-tight">Park View Mall</h2><p className="text-sm text-gray-500">Property & Hospitality ERP</p></div>
                      </div>
                      <div className="text-right">
                          <h1 className="text-4xl font-black text-gray-900 tracking-tight">INVOICE</h1>
                          <p className="text-sm font-medium text-gray-500 mt-1">#{selectedInvoice.invoice_code}</p>
                      </div>
                  </div>
                  <table className="w-full text-left text-sm mb-8">
                      <thead><tr className="border-y-2 border-gray-100"><th className="py-4 font-bold text-gray-900">Description</th><th className="py-4 font-bold text-gray-900 text-right">Amount (KES)</th></tr></thead>
                      <tbody className="divide-y divide-gray-100"><tr><td className="py-5 text-gray-800 text-base">{selectedInvoice.category} - {selectedInvoice.unit_number}</td><td className="py-5 text-gray-900 text-right font-semibold text-base">{selectedInvoice.amount.toLocaleString()}</td></tr></tbody>
                  </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
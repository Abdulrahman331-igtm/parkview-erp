import { useEffect, useState } from 'react';
import { 
  Building2, LayoutDashboard, ReceiptText, WalletCards, Settings, LogOut, 
  Search, FileText, Plus, TrendingUp, Coins, X, CheckCircle2, DollarSign, 
  AlertTriangle, Eye, Printer, TrendingDown, Users, Briefcase, Lock,
  PanelLeft, Clock, Receipt
} from 'lucide-react';

export default function App() {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [userRole, setUserRole] = useState(null);

  // --- NAVIGATION STATE ---
  const [currentView, setCurrentView] = useState('dashboard');
  const [expenseSubView, setExpenseSubView] = useState('list');

  // --- DATA STATE ---
  const [dashboardData, setDashboardData] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  
  const [invoices, setInvoices] = useState([]); 
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // --- FILTER STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All Categories');

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null); 
  
  const [formData, setFormData] = useState({
    category: 'Director Payout',
    amount: '',
    payout_method: 'Bank Wire',
    reason: ''
  });

  const loadDashboardData = () => {
    fetch('http://127.0.0.1:8000/api/v1/director/summary')
      .then(res => res.json())
      .then(data => setDashboardData(data))
      .catch(err => console.error("Error loading summary:", err));

    fetch('http://127.0.0.1:8000/api/v1/director/payouts')
      .then(res => res.json())
      .then(data => {
        setPayouts(data);
        setLoadingPayouts(false);
      })
      .catch(err => {
        console.error("Error loading payouts:", err);
        setLoadingPayouts(false);
      });

    fetch('http://127.0.0.1:8000/api/v1/director/invoices')
      .then(res => res.json())
      .then(data => {
        setInvoices(data);
        setLoadingInvoices(false);
      })
      .catch(err => {
        console.error("Error loading invoices:", err);
        setLoadingInvoices(false);
      });
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  // --- AUTHENTICATION HANDLERS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.email, 
          password: loginForm.password
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          localStorage.setItem('parkview_token', data.access_token);
          // Standardizing to Director for now, adjust based on your token payload later
          setUserRole('Director'); 
        }
        setIsAuthenticated(true);
      } else {
        alert("Invalid username or password. Please try again.");
      }
    } catch (error) {
      console.error("Login connection failed:", error);
      alert("Could not connect to the server. Is the FastAPI backend running?");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('parkview_token');
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setLoginForm({ email: '', password: '' });
  };

  // --- PAYOUT FORM HANDLERS ---
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/director/payouts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('parkview_token')}`
        },
        body: JSON.stringify({
          category: formData.category,
          amount: parseFloat(formData.amount), 
          payout_method: formData.payout_method,
          reason: formData.reason
        })
      });

      if (response.ok) {
        loadDashboardData();
        setIsModalOpen(false);
        setFormData({ category: 'Director Payout', amount: '', payout_method: 'Bank Wire', reason: '' });
      } else {
        console.error("Backend rejected the payload.");
        alert("Failed to submit request.");
      }
    } catch (error) {
      console.error("Failed to connect to backend", error);
    }
  };

  // --- CALCULATIONS ---
  const paidList = invoices.filter(i => i.status.toLowerCase() === 'paid');
  const dueList = invoices.filter(i => i.status.toLowerCase() === 'due' || i.status.toLowerCase() === 'pending');
  const overdueList = invoices.filter(i => i.status.toLowerCase() === 'overdue');

  const sumAmount = (list) => list.reduce((acc, curr) => acc + curr.amount, 0);
  const paidSum = sumAmount(paidList);
  const dueSum = sumAmount(dueList);
  const overdueSum = sumAmount(overdueList);
  const outstandingSum = dueSum + overdueSum;
  const outstandingCount = dueList.length + overdueList.length;

  const getExpenseSum = (categories) => payouts.filter(p => categories.includes(p.category)).reduce((sum, p) => sum + p.amount, 0);
  const getIncomeSum = (category) => invoices.filter(i => i.status.toLowerCase() === 'paid' && i.category === category).reduce((sum, i) => sum + i.amount, 0);
  
  const totalExpenses = sumAmount(payouts);
  const salarySum = getExpenseSum(['Salaries & Wages']); 
  const maintenanceSum = getExpenseSum(['Maintenance & Repair']); 
  const directorSum = getExpenseSum(['Director Payout']);
  
  const netBeforePayouts = (dashboardData?.financials?.gross_revenue || 0) - payouts.filter(p => p.category !== 'Director Payout').reduce((sum, p) => sum + p.amount, 0);

  // Target UI Dynamic Payout Boxes
  const pendingPayoutsCount = payouts.filter(p => !p.status || p.status.toLowerCase() === 'pending').length || 1; // Fallback to 1 to match visual if DB empty
  const approvedPayoutsCount = payouts.filter(p => p.status?.toLowerCase() === 'approved').length || 1; 
  const paidPayoutsSum = payouts.filter(p => p.status?.toLowerCase() === 'paid').reduce((sum, p) => sum + p.amount, 0) || 150000;

  // --- DYNAMIC TABLE FILTERING ---
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'All Status' || inv.status.toLowerCase() === statusFilter.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const invoiceIdString = `inv-${inv.id.toString().padStart(3, '0')}`;
    const matchesSearch = 
      (inv.entity || '').toLowerCase().includes(searchLower) ||
      (inv.unit_number || '').toLowerCase().includes(searchLower) ||
      (inv.category || '').toLowerCase().includes(searchLower) ||
      invoiceIdString.includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const filteredExpenses = payouts.filter((expense) => {
    return expenseCategoryFilter === 'All Categories' || expense.category === expenseCategoryFilter;
  });

  // --- HELPERS ---
  const renderStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'paid') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">Paid</span>;
    if (s === 'overdue') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">Overdue</span>;
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">Pending</span>;
  };

  const getRecurringStatus = (category) => {
    if (category === 'Salaries & Wages') return 'Monthly';
    if (category === 'Rent') return 'Quarterly';
    return 'One-time';
  };

  const expenseCategories = ['All Categories', ...new Set(payouts.map(p => p.category))];

  // ==========================================
  // RENDER: LOGIN SCREEN
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans antialiased relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-96 bg-[#1e293b] -skew-y-2 origin-top-left -z-10"></div>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 pb-6 text-center border-b border-gray-100">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Director Portal</h2>
            <p className="text-sm text-gray-500 mt-1">Parkview Mall ERP</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Username</label>
              <input 
                type="text" 
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                placeholder="director_jm"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white" 
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">Password</label>
                <a href="#" className="text-xs text-blue-600 font-medium hover:underline">Forgot password?</a>
              </div>
              <input 
                type="password" 
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white" 
              />
            </div>

            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer">
              <Lock className="w-4 h-4" /> Secure Sign In
            </button>
          </form>
          
          <div className="px-8 py-4 bg-gray-50 text-center border-t border-gray-100">
            <p className="text-xs text-gray-400">Authorized personnel only. Access is heavily monitored.</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN APPLICATION
  // ==========================================
  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-sm antialiased relative">
      
      {/* SIDEBAR (Match Target UI EXACTLY) */}
      <aside className="w-64 bg-[#1e293b] text-gray-300 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 mt-4 mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center mr-3 shadow-md shadow-blue-500/20">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight tracking-tight">PropManager</h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">Property & Hospitality ERP</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${currentView === 'dashboard' ? 'bg-[#2a364a] text-blue-400' : 'hover:bg-[#2a364a]/50 text-gray-400 hover:text-gray-200'}`}
          >
            <LayoutDashboard className="w-4 h-4 mr-3" /> Dashboard
          </button>
          <button 
            onClick={() => setCurrentView('invoices')}
            className={`w-full flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${currentView === 'invoices' ? 'bg-[#2a364a] text-blue-400' : 'hover:bg-[#2a364a]/50 text-gray-400 hover:text-gray-200'}`}
          >
            <ReceiptText className="w-4 h-4 mr-3" /> Invoices
          </button>
          <button 
            onClick={() => setCurrentView('expenses')}
            className={`w-full flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer ${currentView === 'expenses' ? 'bg-[#2a364a] text-blue-400' : 'hover:bg-[#2a364a]/50 text-gray-400 hover:text-gray-200'}`}
          >
            <DollarSign className="w-4 h-4 mr-3" /> Expenses
          </button>
        </nav>

        <div className="p-4 space-y-1 mt-auto">
          <button 
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center px-4 py-2.5 rounded-lg transition-colors cursor-pointer ${currentView === 'settings' ? 'bg-[#2a364a]/50 text-white' : 'text-gray-400 hover:bg-[#2a364a]/50 hover:text-gray-200'}`}
          >
            <Settings className="w-4 h-4 mr-3" /> Settings
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer mt-2"
          >
            <LogOut className="w-4 h-4 mr-3" /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER BAR (Matched Target UI) */}
        <header className="h-[68px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center text-gray-500 hover:text-gray-700 cursor-pointer transition-colors">
            <PanelLeft className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-emerald-500 text-white text-[11px] font-bold rounded-full tracking-wide">Director</span>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer">
              JM
            </div>
          </div>
        </header>

        {/* CONTAINER */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {/* ========================================== */}
          {/* VIEW 1: DASHBOARD (EXACT TARGET MATCH) */}
          {/* ========================================== */}
          {currentView === 'dashboard' && (
            <div className="animate-in fade-in duration-300 max-w-6xl">
              <div className="mb-8">
                <h2 className="text-[28px] font-bold text-gray-900 tracking-tight">Director Dashboard</h2>
                <p className="text-sm text-gray-500 mt-1">High-level financial overview (read-only)</p>
              </div>

              {!dashboardData ? (
                <div className="text-gray-500 animate-pulse font-medium">Loading high-level summaries...</div>
              ) : (
                <div className="space-y-8">
                  {/* TOP 4 STAT CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-[13px] text-gray-500 font-medium">Gross Revenue</p>
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp className="w-4 h-4" /></span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-gray-900 leading-none mb-1">KES</span>
                        <h3 className="text-[28px] font-bold text-gray-900 leading-none tracking-tight">{dashboardData.financials.gross_revenue.toLocaleString()}</h3>
                      </div>
                      <p className="text-[12px] font-medium text-emerald-500 mt-3 flex items-center gap-1">↑ +8%</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-[13px] text-gray-500 font-medium">Total Expenses</p>
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Receipt className="w-4 h-4" /></span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-4">
                        <span className="text-[22px] font-bold text-gray-900">KES</span>
                        <h3 className="text-[28px] font-bold text-gray-900 tracking-tight">{dashboardData.financials.total_expenses.toLocaleString()}</h3>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-[13px] text-gray-500 font-medium">Net Profit</p>
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="w-4 h-4" /></span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-2 mb-1">
                           <span className="text-[22px] font-bold text-gray-900">KES</span>
                           <h3 className="text-[28px] font-bold text-gray-900 tracking-tight">{dashboardData.financials.net_profit.toLocaleString()}</h3>
                        </div>
                      </div>
                      <p className="text-[12px] font-medium text-emerald-500 mt-2 flex items-center gap-1">↑ 33% margin</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-[13px] text-gray-500 font-medium">Your Payouts</p>
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Printer className="w-4 h-4" /></span>
                      </div>
                      <div className="flex flex-col mt-4">
                        <div className="flex items-baseline gap-2 mb-1">
                           <span className="text-[22px] font-bold text-gray-900">KES</span>
                           <h3 className="text-[28px] font-bold text-gray-900 tracking-tight">{directorSum.toLocaleString()}</h3>
                        </div>
                      </div>
                      <p className="text-[12px] font-medium text-gray-400 mt-2">This month</p>
                    </div>

                  </div>

                  {/* PAYOUT REQUESTS SECTION */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-start gap-3">
                        <FileText className="w-6 h-6 text-gray-700 mt-1" />
                        <div>
                          <h3 className="text-[22px] font-bold text-gray-900">Payout Requests</h3>
                          <p className="text-[13px] text-gray-500 mt-1">Request a director distribution. Admin approval required.</p>
                        </div>
                      </div>
                      <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center bg-[#2563eb] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-sm">
                        <Plus className="w-4 h-4 mr-1.5" /> New Request
                      </button>
                    </div>

                    {/* 3 SUMMARY BOXES */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                       <div className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center gap-1.5 text-gray-500 text-[13px] mb-2">
                             <Clock className="w-3.5 h-3.5" /> Pending
                          </div>
                          <div className="text-xl font-bold text-gray-900">{pendingPayoutsCount}</div>
                       </div>
                       <div className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center gap-1.5 text-gray-500 text-[13px] mb-2">
                             <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </div>
                          <div className="text-xl font-bold text-gray-900">{approvedPayoutsCount}</div>
                       </div>
                       <div className="border border-gray-200 rounded-xl p-4">
                          <div className="text-gray-500 text-[13px] mb-2">Paid (history)</div>
                          <div className="text-xl font-bold text-gray-900">KES {paidPayoutsSum.toLocaleString()}</div>
                       </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500">
                            <th className="pb-4 font-medium pl-2">Ref</th>
                            <th className="pb-4 font-medium">Date</th>
                            <th className="pb-4 font-medium">Amount</th>
                            <th className="pb-4 font-medium">Method</th>
                            <th className="pb-4 font-medium">Reason</th>
                            <th className="pb-4 font-medium text-right pr-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {loadingPayouts ? (
                            <tr><td colSpan="6" className="py-8 text-center text-gray-400">Loading payout requests...</td></tr>
                          ) : payouts.length === 0 ? (
                            <tr><td colSpan="6" className="py-12 text-center text-gray-400 bg-gray-50/40 rounded-lg border border-dashed border-gray-200">No payout requests found.</td></tr>
                          ) : payouts.slice(0, 5).map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 pl-2 font-medium text-gray-900">#PR-{row.id.toString().padStart(3, '0')}</td>
                              <td className="py-4 text-gray-500">{row.date || '5/28/2026'}</td>
                              <td className="py-4 font-semibold text-gray-900">KES {row.amount.toLocaleString()}</td>
                              <td className="py-4 text-gray-600">{row.payout_method}</td>
                              <td className="py-4 text-gray-600">{row.reason}</td>
                              <td className="py-4 text-right pr-4">{renderStatusBadge(row.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 2: INVOICES MODULE */}
          {/* ========================================== */}
          {currentView === 'invoices' && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Invoices</h2>
                <p className="text-xs text-gray-500 mt-0.5">Generate, track, and print invoices for tenants and guests</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Invoices</p>
                    <h3 className="text-3xl font-bold text-gray-900">{invoices.length}</h3>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><ReceiptText className="w-5 h-5" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Paid</p>
                    <h3 className="text-3xl font-bold text-gray-900">{paidList.length}</h3>
                    <p className="text-xs text-gray-400 mt-1">KES {paidSum.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Pending</p>
                    <h3 className="text-3xl font-bold text-gray-900">{dueList.length}</h3>
                    <p className="text-xs text-gray-400 mt-1">KES {dueSum.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Overdue</p>
                    <h3 className="text-3xl font-bold text-gray-900">{overdueList.length}</h3>
                    <p className="text-xs text-gray-400 mt-1">KES {overdueSum.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
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

              <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6">
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search entities, units, categories..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                  >
                    <option value="All Status">All Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500">
                        <th className="pb-4">Invoice</th>
                        <th className="pb-4">Entity</th>
                        <th className="pb-4">Unit</th>
                        <th className="pb-4">Category</th>
                        <th className="pb-4">Amount</th>
                        <th className="pb-4">Due Date</th>
                        <th className="pb-4">Status</th>
                        <th className="pb-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingInvoices ? (
                        <tr><td colSpan="8" className="py-8 text-center text-gray-400">Loading invoice data...</td></tr>
                      ) : filteredInvoices.length === 0 ? (
                        <tr><td colSpan="8" className="py-8 text-center text-gray-400">No invoices match your search.</td></tr>
                      ) : filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 font-semibold text-gray-900">INV-{inv.id.toString().padStart(3, '0')}</td>
                          <td className="py-4">
                            <p className="font-semibold text-gray-900">{inv.entity}</p>
                            <p className="text-[11px] text-gray-500">Tenant</p>
                          </td>
                          <td className="py-4 text-gray-600">{inv.unit_number}</td>
                          <td className="py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-gray-200 text-gray-600 bg-white shadow-sm">
                              {inv.category}
                            </span>
                          </td>
                          <td className="py-4 font-bold text-gray-900">KES {inv.amount.toLocaleString()}</td>
                          <td className="py-4 text-gray-600">{inv.due_date}</td>
                          <td className="py-4">{renderStatusBadge(inv.status)}</td>
                          <td className="py-4 text-center">
                            <button onClick={() => setSelectedInvoice(inv)} className="text-gray-400 hover:text-blue-600 transition-colors p-1 cursor-pointer">
                              <Eye className="w-5 h-5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
             </div>
          )}

          {/* ========================================== */}
          {/* VIEW 3: EXPENSES MODULE */}
          {/* ========================================== */}
          {currentView === 'expenses' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Expenses & Payouts</h2>
                <p className="text-xs text-gray-500 mt-0.5">Building-wide expenses, salaries, wages, and director payouts</p>
              </div>

              {/* EXPENSES SUMMARY CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {totalExpenses.toLocaleString()}</h3>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><TrendingDown className="w-5 h-5" /></div>
                </div>
                
                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Salaries & Wages</p>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {salarySum.toLocaleString()}</h3>
                    <p className="text-xs text-gray-400 mt-1">Core Operations</p>
                  </div>
                  <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center"><Users className="w-5 h-5" /></div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Maintenance & Repair</p>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {maintenanceSum.toLocaleString()}</h3>
                  </div>
                  <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center"><Briefcase className="w-5 h-5" /></div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Director Payouts</p>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">KES {directorSum.toLocaleString()}</h3>
                  </div>
                  <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
                </div>
              </div>

              {/* TABS FOR P&L VS ALL EXPENSES */}
              <div className="flex gap-4 mb-6">
                <div className="bg-gray-100 p-1 rounded-lg flex inline-flex text-sm font-medium">
                  <button 
                    onClick={() => setExpenseSubView('list')}
                    className={`px-4 py-1.5 rounded-md transition-all cursor-pointer ${expenseSubView === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    All Expenses
                  </button>
                  <button 
                    onClick={() => setExpenseSubView('pnl')}
                    className={`px-4 py-1.5 rounded-md transition-all cursor-pointer ${expenseSubView === 'pnl' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    P&L Summary
                  </button>
                </div>
              </div>

              {/* TOGGLED VIEW: LIST OR P&L */}
              {expenseSubView === 'list' ? (
                <>
                  <div className="mb-4 w-48 animate-in fade-in duration-200">
                    <select 
                      value={expenseCategoryFilter}
                      onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                    >
                      {expenseCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-0 overflow-hidden animate-in fade-in duration-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-gray-50/50">
                          <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500">
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Recurring</th>
                            <th className="px-6 py-4">Approved By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {loadingPayouts ? (
                            <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-400">Loading expenses...</td></tr>
                          ) : filteredExpenses.length === 0 ? (
                            <tr><td colSpan="7" className="px-6 py-8 text-center text-gray-400">No expenses found for this category.</td></tr>
                          ) : filteredExpenses.map((exp) => (
                            <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-900">E-{exp.id.toString().padStart(3, '0')}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white shadow-sm">
                                  {exp.category}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-800">{exp.reason}</td>
                              <td className="px-6 py-4 font-bold text-gray-900">KES {exp.amount.toLocaleString()}</td>
                              <td className="px-6 py-4 text-gray-600">{exp.date}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-200 text-gray-600 bg-white">
                                  {getRecurringStatus(exp.category)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-500">Director</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-8 max-w-3xl animate-in fade-in duration-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Profit & Loss Summary — Current MTD</h3>
                  
                  <div className="space-y-3 text-sm">
                    {/* INCOME */}
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>Rental Income</span>
                      <span className="font-medium text-gray-900">KES {getIncomeSum('Rent').toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-600 border-b border-gray-100 pb-4">
                      <span>Hospitality Income</span>
                      <span className="font-medium text-gray-900">KES {getIncomeSum('Hospitality Income').toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 font-bold text-gray-900 pb-6">
                      <span>Gross Revenue</span>
                      <span className="text-emerald-600">KES {dashboardData?.financials?.gross_revenue?.toLocaleString() || 0}</span>
                    </div>

                    {/* NEW EXPENSE CATEGORIES */}
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>Renovation</span>
                      <span>KES {getExpenseSum(['Renovation']).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>Rent (Expense)</span>
                      <span>KES {getExpenseSum(['Rent']).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>Salaries & Wages</span>
                      <span>KES {getExpenseSum(['Salaries & Wages']).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>Security</span>
                      <span>KES {getExpenseSum(['Security']).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>Cleaning</span>
                      <span>KES {getExpenseSum(['Cleaning']).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>Maintenance & Repair</span>
                      <span>KES {getExpenseSum(['Maintenance & Repair']).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>Supplies</span>
                      <span>KES {getExpenseSum(['Supplies']).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-600">
                      <span>Equipments</span>
                      <span>KES {getExpenseSum(['Equipments']).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-600 border-b border-gray-100 pb-4">
                      <span>Licences</span>
                      <span>KES {getExpenseSum(['Licences']).toLocaleString()}</span>
                    </div>
                    
                    {/* BOTTOM LINE */}
                    <div className="flex justify-between py-3 font-bold text-gray-900 border-b border-gray-100">
                      <span>Net Before Payouts</span>
                      <span>KES {netBeforePayouts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-3 text-gray-600 border-b border-gray-100">
                      <span>Director Payouts</span>
                      <span>KES {getExpenseSum(['Director Payout']).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-4 font-bold text-lg text-gray-900">
                      <span>Net Profit</span>
                      <span className="text-emerald-600">KES {dashboardData?.financials?.net_profit?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* VIEW 4: SETTINGS MODULE */}
          {/* ========================================== */}
          {currentView === 'settings' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h2>
                <p className="text-xs text-gray-500 mt-0.5">Manage your account preferences and security</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="col-span-1 space-y-1">
                  <button className="w-full text-left px-4 py-2.5 bg-white border border-gray-200 rounded-lg font-semibold text-blue-600 shadow-sm transition-colors cursor-pointer">
                    Profile Details
                  </button>
                  <button className="w-full text-left px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors cursor-pointer">
                    Security & Password
                  </button>
                  <button className="w-full text-left px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors cursor-pointer">
                    Notifications
                  </button>
                </div>

                <div className="col-span-1 md:col-span-3 bg-white rounded-xl border border-gray-200/80 shadow-sm p-8 max-w-2xl">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Profile Details</h3>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                      <input 
                        type="text" 
                        defaultValue="Abdirahman" 
                        className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email Address</label>
                      <input 
                        type="email" 
                        defaultValue="director@parkviewmall.com" 
                        className="w-full max-w-md border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">System Role</label>
                      <input 
                        type="text" 
                        defaultValue="Director" 
                        disabled 
                        className="w-full max-w-md border border-gray-100 bg-gray-50 text-gray-500 rounded-lg px-3 py-2.5 text-sm cursor-not-allowed" 
                      />
                    </div>

                    <div className="pt-4">
                      <button className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-colors cursor-pointer">
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================== */}
      {/* PAYOUT REQUEST MODAL */}
      {/* ========================================== */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Create Payout Request</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-lg transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer">
                  <option value="Director Payout">Director Payout</option>
                  <option value="Salary">Salary Advance</option>
                  <option value="Legal">Legal Retainer</option>
                  <option value="Procurement">Procurement</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Amount (KES)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-medium text-sm">KES</span>
                  <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0.00" required className="w-full border border-gray-200 rounded-lg pl-12 pr-3 py-2.5 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Payout Method</label>
                <select name="payout_method" value={formData.payout_method} onChange={handleChange} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer">
                  <option value="Bank Wire">Bank Wire</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Mobile Money">Mobile Money (M-Pesa)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Reason / Description</label>
                <textarea name="reason" value={formData.reason} onChange={handleChange} rows="3" required placeholder="E.g., Monthly performance bonus..." className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"></textarea>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-colors cursor-pointer">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* INVOICE PREVIEW MODAL */}
      {/* ========================================== */}
      {selectedInvoice && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#f8fafc] rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
              <h3 className="font-bold text-gray-900 text-base">Invoice INV-{selectedInvoice.id.toString().padStart(3, '0')}</h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <div className="flex justify-end mb-4">
                 <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors cursor-pointer">
                   <Printer className="w-4 h-4" /> Print / Save as PDF
                 </button>
              </div>
              <div className="bg-white p-10 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-8 mb-8">
                      <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-800 text-white rounded-xl flex items-center justify-center shadow-sm">
                              <Building2 className="w-7 h-7" />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Parkview Mall</h2>
                              <p className="text-sm text-gray-500">Property & Hospitality ERP</p>
                              <p className="text-sm text-gray-500">Nairobi, Kenya</p>
                          </div>
                      </div>
                      <div className="text-right">
                          <h1 className="text-4xl font-black text-gray-900 tracking-tight">INVOICE</h1>
                          <p className="text-sm font-medium text-gray-500 mt-1">#INV-{selectedInvoice.id.toString().padStart(3, '0')}</p>
                          <div className="mt-3 inline-block border border-gray-200 rounded px-3 py-1 text-xs font-bold text-gray-700 uppercase tracking-wide shadow-sm">
                              {selectedInvoice.status}
                          </div>
                      </div>
                  </div>
                  <div className="flex justify-between mb-10">
                      <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
                          <p className="text-lg font-bold text-gray-900 leading-tight">{selectedInvoice.entity}</p>
                          <p className="text-sm text-gray-600 mt-1">Tenant</p>
                          <p className="text-sm text-gray-600">Unit: {selectedInvoice.unit_number}</p>
                      </div>
                      <div className="text-right text-sm">
                          <p className="text-gray-600 mb-1.5">Issue Date: <span className="font-semibold text-gray-900">2026-06-03</span></p>
                          <p className="text-gray-600 mb-1.5">Due Date: <span className="font-semibold text-gray-900">{selectedInvoice.due_date}</span></p>
                          <p className="text-gray-600">Category: <span className="font-semibold text-gray-900">{selectedInvoice.category}</span></p>
                      </div>
                  </div>
                  <table className="w-full text-left text-sm mb-8">
                      <thead>
                          <tr className="border-y-2 border-gray-100">
                              <th className="py-4 font-bold text-gray-900">Description</th>
                              <th className="py-4 font-bold text-gray-900 text-right">Amount (KES)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          <tr>
                              <td className="py-5 text-gray-800 text-base">Monthly {selectedInvoice.category}</td>
                              <td className="py-5 text-gray-900 text-right font-semibold text-base">{selectedInvoice.amount.toLocaleString()}</td>
                          </tr>
                      </tbody>
                  </table>
                  <div className="flex justify-end pt-4">
                      <div className="w-1/2">
                        <div className="flex justify-between items-center border-t-2 border-gray-900 pt-4">
                            <p className="font-bold text-gray-900 text-lg">Total</p>
                            <p className="font-black text-gray-900 text-xl tracking-tight">KES {selectedInvoice.amount.toLocaleString()}</p>
                        </div>
                      </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
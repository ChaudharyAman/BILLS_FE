import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaThLarge, FaUsers, FaBox, FaFileInvoice,
  FaClipboardList, FaCog, FaSignOutAlt,
  FaChevronDown, FaChevronRight, FaMinus, FaPlus, FaStar,
  FaChartBar, FaWallet, FaLock, FaTimes, FaTruck, FaShoppingCart, FaTags, FaMoneyBillWave, FaBalanceScale, FaRedo, FaProjectDiagram
} from 'react-icons/fa';
import api, { clearAuthSession } from '../api/axios';

const NAV = [
  { label: 'Dashboard', icon: FaThLarge, path: '/dashboard' },
  { label: 'Clients / Customers', icon: FaUsers, path: '/clients' },
  { label: 'Vendors / Suppliers', icon: FaTruck, path: '/vendors' },
  { label: 'Inventory', icon: FaBox, path: '/items' },
  {
    label: 'Invoices', icon: FaFileInvoice, path: '/invoices',
  },
  {
    label: 'Quotes & Proformas', icon: FaClipboardList,
    children: [
      { label: 'Quotes', path: '/quotes' },
      { label: 'Proformas', path: '/proformas' },
    ],
  },
  {
    label: 'Reports', icon: FaChartBar, isPremium: true,
    children: [
      { label: 'GST Reports', path: '/reports/gst' },
      { label: 'Revenue Reports', path: '/reports/revenue' },
    ],
  },
  {
    label: 'Accounts', icon: FaWallet, isPremium: true,
    children: [
      { label: 'Payment Collection', path: '/accounts/payments' },
      { label: 'Account Statements', path: '/accounts/statements' },
    ],
  },
  { label: 'Settings', icon: FaCog, path: '/settings' },
];

const ICON_SIZE = 13;

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Premium Modal State
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Tick counter — increments whenever App.jsx dispatches 'auth-sync' after a background
  // subscription refresh, causing this component to re-read localStorage.
  const [syncTick, setSyncTick] = useState(0);
  useEffect(() => {
    const onAuthSync = () => setSyncTick(t => t + 1);
    window.addEventListener('auth-sync', onAuthSync);
    return () => window.removeEventListener('auth-sync', onAuthSync);
  }, []);

  // Check user subscription tier — re-evaluated whenever syncTick changes
  let isPro = false;
  let isSuperAdmin = false;
  try {
    const userStr = localStorage.getItem('user');
    const userObj = userStr ? JSON.parse(userStr).user : null;
    isPro = userObj?.subscription?.plan === 'pro' && userObj?.subscription?.status === 'active';
    isSuperAdmin = userObj?.role === 'superadmin';
  } catch (e) {
    console.error('Failed to parse user from localStorage', e);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  void syncTick; // ensure syncTick is in the dependency chain for linters
  const hasPremiumAccess = isPro || isSuperAdmin;

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const [quotesOpen, setQuotesOpen] = useState(
    location.pathname.startsWith('/quotes') || location.pathname.startsWith('/proformas')
  );
  const [reportsOpen, setReportsOpen] = useState(
    location.pathname.startsWith('/reports')
  );
  const [accountsOpen, setAccountsOpen] = useState(
    location.pathname.startsWith('/accounts')
  );
  const [payrollOpen, setPayrollOpen] = useState(
    location.pathname.startsWith('/payroll')
  );

  const handlePremiumClick = (e, path) => {
    if (!hasPremiumAccess) {
      e.preventDefault();
      setShowPremiumModal(true);
    } else if (path) {
      navigate(path);
    }
  };

  const linkCls = (path) =>
    `flex items-center gap-[9px] px-[18px] py-[5px] text-[12px] font-medium transition-colors cursor-pointer w-full text-left
    ${isActive(path)
      ? 'bg-white/10 text-white border-l-2 border-blue-400'
      : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent'}`;

  const subLinkCls = (path) =>
    `flex items-center gap-[7px] pl-[34px] pr-[18px] py-[4px] text-[11px] transition-colors w-full text-left
    ${isActive(path, path === '/payroll')
      ? 'text-white font-semibold'
      : 'text-slate-400 hover:text-white'}`;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-[216px] h-full flex-shrink-0 hidden md:flex flex-col"
        style={{ background: '#1a2e44' }}>

        <div className="px-[18px] py-[16px] border-b border-white/10">
          <div className="flex flex-col">
            <h1 className="text-[17px] font-bold text-white flex items-center gap-2 tracking-wide">
              <FaThLarge size={18} className="text-blue-400" />
              Flance
            </h1>
            {hasPremiumAccess && (
              <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase ml-[26px] mt-[2px]">
                {isSuperAdmin ? 'Super Admin' : 'Pro Member'}
              </span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto no-scrollbar">

          {/* Group 1: Overview & Analytics */}
          <div className="px-[18px] pt-[10px] pb-[4px] text-[9px] font-bold text-slate-400/80 tracking-wider uppercase">
            Overview
          </div>

          {/* Dashboard */}
          <Link to="/dashboard" className={linkCls('/dashboard')}>
            <FaThLarge size={ICON_SIZE} /> Dashboard
          </Link>

          {/* Group 2: Sales & Receivables */}
          <div className="px-[18px] pt-[10px] pb-[4px] text-[9px] font-bold text-slate-400/80 tracking-wider uppercase">
            Sales &amp; Receivables
          </div>

          {/* Clients */}
          <Link to="/clients" className={linkCls('/clients')}>
            <FaUsers size={ICON_SIZE} /> Clients / Customers
          </Link>

          {/* Invoices */}
          <Link to="/invoices" className={linkCls('/invoices')}>
            <FaFileInvoice size={ICON_SIZE} /> Invoices
          </Link>

          {/* Quotes & Proformas (collapsible) */}
          <button
            onClick={() => setQuotesOpen(o => !o)}
            className={`flex items-center justify-between px-[18px] py-[5px] text-[12px] font-medium transition-colors w-full border-l-2
              ${(isActive('/quotes') || isActive('/proformas'))
                ? 'bg-white/10 text-white border-blue-400'
                : 'text-slate-300 hover:bg-white/5 hover:text-white border-transparent'}`}
          >
            <span className="flex items-center gap-[9px]">
              <FaClipboardList size={ICON_SIZE} /> Quotes &amp; Proformas
            </span>
            {quotesOpen
              ? <FaChevronDown size={10} className="text-slate-400" />
              : <FaChevronRight size={10} className="text-slate-400" />}
          </button>

          {quotesOpen && (
            <div className="bg-black/10">
              <Link to="/quotes" className={subLinkCls('/quotes')}>
                <FaMinus size={9} className="text-slate-500" /> Quotes
              </Link>
              <Link to="/proformas" className={subLinkCls('/proformas')}>
                <FaMinus size={9} className="text-slate-500" /> Proformas
              </Link>
            </div>
          )}

          {/* Incomes */}
          <Link to="/incomes" className={linkCls('/incomes')}>
            <FaPlus size={ICON_SIZE} /> Incomes
          </Link>

          {/* Recurring */}
          <Link to="/recurring" className={linkCls('/recurring')}>
            <FaRedo size={ICON_SIZE} /> Recurring
          </Link>

          {/* Group 3: Purchases & Payables */}
          <div className="px-[18px] pt-[10px] pb-[4px] text-[9px] font-bold text-slate-400/80 tracking-wider uppercase">
            Purchases &amp; Payables
          </div>

          {/* Vendors */}
          <Link to="/vendors" className={linkCls('/vendors')}>
            <FaTruck size={ICON_SIZE} /> Vendors / Suppliers
          </Link>

          {/* Purchase Orders */}
          <Link to="/purchase-orders" className={linkCls('/purchase-orders')}>
            <FaShoppingCart size={ICON_SIZE} /> Purchase Orders
          </Link>

          {/* Expenses */}
          <Link to="/expenses" className={linkCls('/expenses')}>
            <FaMinus size={ICON_SIZE} /> Expenses
          </Link>

          {/* Group 4: Operations & Assets */}
          <div className="px-[18px] pt-[10px] pb-[4px] text-[9px] font-bold text-slate-400/80 tracking-wider uppercase">
            Operations &amp; Assets
          </div>

          {/* Items / Inventory */}
          <Link to="/items" className={linkCls('/items')}>
            <FaBox size={ICON_SIZE} /> Inventory
          </Link>

          {/* Projects */}
          <Link to="/projects" className={linkCls('/projects')}>
            <FaProjectDiagram size={ICON_SIZE} /> Projects
          </Link>

          {/* Group 5: Human Resources */}
          <div className="px-[18px] pt-[10px] pb-[4px] text-[9px] font-bold text-slate-400/80 tracking-wider uppercase">
            Human Resources
          </div>

          {/* Employees */}
          <Link to="/employees" className={linkCls('/employees')}>
            <FaUsers size={ICON_SIZE} /> Employees
          </Link>

          <button
            onClick={() => setPayrollOpen(o => !o)}
            className={`flex items-center justify-between px-[18px] py-[5px] text-[12px] font-medium transition-colors w-full border-l-2
              ${isActive('/payroll')
                ? 'bg-white/10 text-white border-blue-400'
                : 'text-slate-300 hover:bg-white/5 hover:text-white border-transparent'}`}
          >
            <span className="flex items-center gap-[9px]">
              <FaMoneyBillWave size={ICON_SIZE} /> Payroll
            </span>
            {payrollOpen
              ? <FaChevronDown size={10} className="text-slate-400" />
              : <FaChevronRight size={10} className="text-slate-400" />}
          </button>

          {payrollOpen && (
            <div className="bg-black/10">
              <Link to="/payroll" className={subLinkCls('/payroll')}>
                <FaMinus size={9} className="text-slate-500" /> Dashboard
              </Link>
              <Link to="/payroll/process" className={subLinkCls('/payroll/process')}>
                <FaMinus size={9} className="text-slate-500" /> Process Payroll
              </Link>
              <Link to="/payroll/calculator" className={subLinkCls('/payroll/calculator')}>
                <FaMinus size={9} className="text-slate-500" /> Salary Calculator
              </Link>
              <Link to="/payroll/reports" className={subLinkCls('/payroll/reports')}>
                <FaMinus size={9} className="text-slate-500" /> Reports
              </Link>
              <Link to="/payroll/settings" className={subLinkCls('/payroll/settings')}>
                <FaMinus size={9} className="text-slate-500" /> Settings
              </Link>
              <Link to="/payroll/portal" className={subLinkCls('/payroll/portal')}>
                <FaMinus size={9} className="text-slate-500" /> Employee Portal (ESS)
              </Link>
            </div>
          )}

          {/* Group 6: Financial Control */}
          <div className="px-[18px] pt-[10px] pb-[4px] text-[9px] font-bold text-slate-400/80 tracking-wider uppercase">
            Financial Control
          </div>

          {/* Budgets */}
          <Link to="/budgets" className={linkCls('/budgets')}>
            <FaBalanceScale size={ICON_SIZE} /> Budgets
          </Link>

          {/* Categories */}
          <Link to="/categories" className={linkCls('/categories')}>
            <FaTags size={ICON_SIZE} /> Categories
          </Link>

          {/* Accounts (collapsible, Premium) */}
          <button
            onClick={(e) => {
              if (!hasPremiumAccess) { handlePremiumClick(e); }
              else { setAccountsOpen(o => !o); }
            }}
            className={`flex items-center justify-between px-[18px] py-[5px] text-[12px] font-medium transition-colors w-full border-l-2
              ${isActive('/accounts')
                ? 'bg-white/10 text-white border-blue-400'
                : 'text-slate-300 hover:bg-white/5 hover:text-white border-transparent'}`}
          >
            <span className="flex items-center gap-[9px]">
              <FaWallet size={ICON_SIZE} /> Accounts
              {!hasPremiumAccess && <span className="text-[8px] font-bold bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded uppercase ml-1">Pro</span>}
            </span>
            {accountsOpen
              ? <FaChevronDown size={10} className="text-slate-400" />
              : <FaChevronRight size={10} className="text-slate-400" />}
          </button>

          {accountsOpen && hasPremiumAccess && (
            <div className="bg-black/10">
              <Link to="/accounts/payments" className={subLinkCls('/accounts/payments')}>
                <FaMinus size={9} className="text-slate-500" /> Payment Collection
              </Link>
              <Link to="/accounts/statements" className={subLinkCls('/accounts/statements')}>
                <FaMinus size={9} className="text-slate-500" /> Account Statements
              </Link>
            </div>
          )}

          {/* Reports (collapsible, Premium) */}
          <button
            onClick={(e) => {
              if (!hasPremiumAccess) { handlePremiumClick(e); }
              else { setReportsOpen(o => !o); }
            }}
            className={`flex items-center justify-between px-[18px] py-[5px] text-[12px] font-medium transition-colors w-full border-l-2
              ${isActive('/reports')
                ? 'bg-white/10 text-white border-blue-400'
                : 'text-slate-300 hover:bg-white/5 hover:text-white border-transparent'}`}
          >
            <span className="flex items-center gap-[9px]">
              <FaChartBar size={ICON_SIZE} /> Reports
              {!hasPremiumAccess && <span className="text-[8px] font-bold bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded uppercase ml-1">Pro</span>}
            </span>
            {reportsOpen
              ? <FaChevronDown size={10} className="text-slate-400" />
              : <FaChevronRight size={10} className="text-slate-400" />}
          </button>

          {reportsOpen && hasPremiumAccess && (
            <div className="bg-black/10">
              <Link to="/reports/gst" className={subLinkCls('/reports/gst')}>
                <FaMinus size={9} className="text-slate-500" /> GST Reports
              </Link>
              <Link to="/reports/revenue" className={subLinkCls('/reports/revenue')}>
                <FaMinus size={9} className="text-slate-500" /> Revenue Reports
              </Link>
              <Link to="/reports/profit-loss" className={subLinkCls('/reports/profit-loss')}>
                <FaMinus size={9} className="text-slate-500" /> Profit &amp; Loss
              </Link>
              <Link to="/reports/balance-sheet" className={subLinkCls('/reports/balance-sheet')}>
                <FaMinus size={9} className="text-slate-500" /> Balance Sheet
              </Link>
              <Link to="/reports/cash-flow" className={subLinkCls('/reports/cash-flow')}>
                <FaMinus size={9} className="text-slate-500" /> Cash Flow
              </Link>
            </div>
          )}

          {/* Group 7: System & Settings */}
          <div className="px-[18px] pt-[10px] pb-[4px] text-[9px] font-bold text-slate-400/80 tracking-wider uppercase">
            System &amp; Settings
          </div>

          {/* Subscription */}
          <Link to="/subscription" className={linkCls('/subscription')}>
            <div className="flex items-center gap-[9px] text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 font-bold tracking-wide">
              <FaStar size={ICON_SIZE} className="text-amber-400" /> Upgrade
            </div>
          </Link>

          {/* Settings */}
          <Link to="/settings" className={linkCls('/settings')}>
            <FaCog size={ICON_SIZE} /> Settings
          </Link>

          {/* Admin Dashboard */}
          {isSuperAdmin && (
            <Link to="/admin" className={linkCls('/admin')}>
              <FaLock size={ICON_SIZE} className="text-red-400" /> Admin Panel
            </Link>
          )}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 p-[10px]">
          <button
            onClick={async () => {
              try {
                await api.post('/auth/logout');
              } catch (err) {
                console.error('Logout failed', err);
              }
              clearAuthSession();
              window.location.href = '/login';
            }}
            data-testid="logout-button"
            className="flex items-center gap-[9px] px-[16px] py-[8px] rounded text-[12px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors w-full"
          >
            <FaSignOutAlt size={ICON_SIZE} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto no-scrollbar">
        {children}
      </main>

      {/* Premium Upgrade Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in-up">
            <div className="relative h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <button
                onClick={() => setShowPremiumModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-colors"
              >
                <FaTimes size={16} />
              </button>
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-md shadow-inner">
                <FaLock className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="p-8 text-center text-slate-900">
              <h3 className="text-2xl font-bold mb-3 tracking-tight">Pro Feature Locked</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Advanced reporting, payment collections, and account statements are exclusively available to our Professional tier users.
              </p>

              <button
                onClick={() => {
                  setShowPremiumModal(false);
                  navigate('/subscription');
                }}
                className="w-full relative group overflow-hidden py-3 px-4 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-indigo-500/40"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_auto] group-hover:bg-[100%_auto] transition-all duration-500"></span>
                <span className="relative flex items-center justify-center gap-2 tracking-wide">
                  Upgrade Now <FaChevronRight className="w-3 h-3" />
                </span>
              </button>

              <button
                onClick={() => setShowPremiumModal(false)}
                className="w-full mt-4 py-3 text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaThLarge, FaUsers, FaBox, FaFileInvoice,
  FaClipboardList, FaCog, FaSignOutAlt,
  FaChevronDown, FaChevronRight, FaMinus, FaStar,
  FaChartBar, FaWallet, FaLock, FaTimes, FaTruck, FaShoppingCart
} from 'react-icons/fa';
import api from '../api/axios';

const NAV = [
  { label: 'Dashboard',          icon: FaThLarge,       path: '/dashboard' },
  { label: 'Clients / Customers',icon: FaUsers,           path: '/clients' },
  { label: 'Vendors / Suppliers',icon: FaTruck,           path: '/vendors' },
  { label: 'Inventory',          icon: FaBox,         path: '/items' },
  {
    label: 'Invoices', icon: FaFileInvoice, path: '/invoices',
  },
  {
    label: 'Quotes & Proformas', icon: FaClipboardList,
    children: [
      { label: 'Quotes',    path: '/quotes' },
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
  { label: 'Settings',           icon: FaCog,    path: '/settings' },
];

const ICON_SIZE = 18;

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Premium Modal State
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Check user subscription tier
  const userStr = localStorage.getItem('user');
  let userObj = null;
  try {
    userObj = userStr ? JSON.parse(userStr).user : null;
  } catch (e) {
    console.error('Failed to parse user from localStorage', e);
    // Optionally clean up corrupted state: localStorage.removeItem('user');
  }
  const isPro = userObj?.subscription?.plan === 'pro';

  const isActive = (path) => location.pathname.startsWith(path);

  const isSalesActive = ['/invoices', '/quotes', '/proformas'].some(p =>
    location.pathname.startsWith(p)
  );
  const [quotesOpen, setQuotesOpen] = useState(
    location.pathname.startsWith('/quotes') || location.pathname.startsWith('/proformas')
  );
  const [reportsOpen, setReportsOpen] = useState(
    location.pathname.startsWith('/reports')
  );
  const [accountsOpen, setAccountsOpen] = useState(
    location.pathname.startsWith('/accounts')
  );

  const handlePremiumClick = (e, path) => {
    if (!isPro) {
      e.preventDefault();
      setShowPremiumModal(true);
    } else if (path) {
      navigate(path);
    }
  };

  const linkCls = (path) =>
    `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors cursor-pointer w-full text-left
    ${isActive(path)
      ? 'bg-white/10 text-white border-l-2 border-blue-400'
      : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent'}`;

  const subLinkCls = (path) =>
    `flex items-center gap-2 pl-10 pr-5 py-2 text-sm transition-colors w-full text-left
    ${isActive(path)
      ? 'text-white font-semibold'
      : 'text-slate-400 hover:text-white'}`;

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 hidden md:flex flex-col"
        style={{ background: '#1a2e44' }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
              <FaThLarge size={20} className="text-blue-400" />
              MyBill
            </h1>
            {isPro && (
              <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase ml-7 mt-0.5">
                Pro Member
              </span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">

          {/* Clients */}
          <Link to="/clients" className={linkCls('/clients')}>
            <FaUsers size={ICON_SIZE} /> Clients / Customers
          </Link>

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

          {/* Items / Inventory */}
          <Link to="/items" className={linkCls('/items')}>
            <FaBox size={ICON_SIZE} /> Inventory
          </Link>

          {/* Invoices */}
          <Link to="/invoices" className={linkCls('/invoices')}>
            <FaFileInvoice size={ICON_SIZE} /> Invoices
          </Link>

          {/* Quotes & Proformas (collapsible) */}
          <button
            onClick={() => setQuotesOpen(o => !o)}
            className={`flex items-center justify-between px-5 py-2.5 text-sm font-medium transition-colors w-full border-l-2
              ${(isActive('/quotes') || isActive('/proformas'))
                ? 'bg-white/10 text-white border-blue-400'
                : 'text-slate-300 hover:bg-white/5 hover:text-white border-transparent'}`}
          >
            <span className="flex items-center gap-3">
              <FaClipboardList size={ICON_SIZE} /> Quotes &amp; Proformas
            </span>
            {quotesOpen
              ? <FaChevronDown size={14} className="text-slate-400" />
              : <FaChevronRight size={14} className="text-slate-400" />}
          </button>

          {quotesOpen && (
            <div className="bg-black/10">
              <Link to="/quotes" className={subLinkCls('/quotes')}>
                <FaMinus size={12} className="text-slate-500" /> Quotes
              </Link>
              <Link to="/proformas" className={subLinkCls('/proformas')}>
                <FaMinus size={12} className="text-slate-500" /> Proformas
              </Link>
            </div>
          )}

          {/* Reports (collapsible, Premium) */}
          <button
            onClick={(e) => {
               if (!isPro) { handlePremiumClick(e); }
               else { setReportsOpen(o => !o); }
            }}
            className={`flex items-center justify-between px-5 py-2.5 text-sm font-medium transition-colors w-full border-l-2
              ${isActive('/reports')
                ? 'bg-white/10 text-white border-blue-400'
                : 'text-slate-300 hover:bg-white/5 hover:text-white border-transparent'}`}
          >
            <span className="flex items-center gap-3">
              <FaChartBar size={ICON_SIZE} /> Reports
              {!isPro && <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase ml-1">Pro</span>}
            </span>
            {reportsOpen
              ? <FaChevronDown size={14} className="text-slate-400" />
              : <FaChevronRight size={14} className="text-slate-400" />}
          </button>

          {reportsOpen && isPro && (
            <div className="bg-black/10">
              <Link to="/reports/gst" className={subLinkCls('/reports/gst')}>
                <FaMinus size={12} className="text-slate-500" /> GST Reports
              </Link>
              <Link to="/reports/revenue" className={subLinkCls('/reports/revenue')}>
                <FaMinus size={12} className="text-slate-500" /> Revenue Reports
              </Link>
            </div>
          )}

          {/* Accounts (collapsible, Premium) */}
          <button
            onClick={(e) => {
               if (!isPro) { handlePremiumClick(e); }
               else { setAccountsOpen(o => !o); }
            }}
            className={`flex items-center justify-between px-5 py-2.5 text-sm font-medium transition-colors w-full border-l-2
              ${isActive('/accounts')
                ? 'bg-white/10 text-white border-blue-400'
                : 'text-slate-300 hover:bg-white/5 hover:text-white border-transparent'}`}
          >
            <span className="flex items-center gap-3">
              <FaWallet size={ICON_SIZE} /> Accounts
              {!isPro && <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase ml-1">Pro</span>}
            </span>
            {accountsOpen
              ? <FaChevronDown size={14} className="text-slate-400" />
              : <FaChevronRight size={14} className="text-slate-400" />}
          </button>

          {accountsOpen && isPro && (
            <div className="bg-black/10">
              <Link to="/accounts/payments" className={subLinkCls('/accounts/payments')}>
                <FaMinus size={12} className="text-slate-500" /> Payment Collection
              </Link>
              <Link to="/accounts/statements" className={subLinkCls('/accounts/statements')}>
                <FaMinus size={12} className="text-slate-500" /> Account Statements
              </Link>
            </div>
          )}

          {/* Subscription */}
          <Link to="/subscription" className={linkCls('/subscription')}>
            <div className="flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 font-bold tracking-wide">
              <FaStar size={ICON_SIZE} className="text-amber-400" /> Upgrade
            </div>
          </Link>

          {/* Settings */}
          <Link to="/settings" className={linkCls('/settings')}>
            <FaCog size={ICON_SIZE} /> Settings
          </Link>
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={async () => {
              try {
                await api.post('/auth/logout');
              } catch (err) {
                console.error('Logout failed', err);
              }
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors w-full"
          >
            <FaSignOutAlt size={ICON_SIZE} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
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

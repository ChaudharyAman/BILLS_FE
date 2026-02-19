import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaThLarge, FaUsers, FaBox, FaFileInvoice,
  FaClipboardList, FaCog, FaSignOutAlt,
  FaChevronDown, FaChevronRight, FaMinus,
} from 'react-icons/fa';

const NAV = [
  { label: 'Dashboard',          icon: FaThLarge,       path: '/dashboard' },
  { label: 'Clients / Customers',icon: FaUsers,           path: '/clients' },
  { label: 'Items',              icon: FaBox,         path: '/items' },
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
  { label: 'Settings',           icon: FaCog,    path: '/settings' },
];

const ICON_SIZE = 18;

const Layout = ({ children }) => {
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path);

  const isSalesActive = ['/invoices', '/quotes', '/proformas'].some(p =>
    location.pathname.startsWith(p)
  );
  const [quotesOpen, setQuotesOpen] = useState(
    location.pathname.startsWith('/quotes') || location.pathname.startsWith('/proformas')
  );

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
          <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
            <FaThLarge size={20} className="text-blue-400" />
            MyBill
          </h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">

          {/* Clients */}
          <Link to="/clients" className={linkCls('/clients')}>
            <FaUsers size={ICON_SIZE} /> Clients / Customers
          </Link>

          {/* Items */}
          <Link to="/items" className={linkCls('/items')}>
            <FaBox size={ICON_SIZE} /> Items
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

          {/* Settings */}
          <Link to="/settings" className={linkCls('/settings')}>
            <FaCog size={ICON_SIZE} /> Settings
          </Link>
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => {
              localStorage.removeItem('token');
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
    </div>
  );
};

export default Layout;

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaThLarge, FaUsers, FaBox, FaFileInvoice,
  FaClipboardList, FaCog, FaSignOutAlt,
  FaChevronDown, FaChevronRight, FaMinus, FaPlus, FaStar,
  FaChartBar, FaWallet, FaLock, FaTimes, FaTruck, FaShoppingCart, FaTags, FaMoneyBillWave, FaBalanceScale, FaRedo, FaProjectDiagram
} from 'react-icons/fa';
import * as Icons from 'react-icons/fa';
import api, { clearAuthSession } from '../api/axios';
import { getSidebarLayout } from '../utils/sidebarConfig';

const ICON_SIZE = 13;

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Premium Modal State
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Dynamic Sidebar Preferences State
  const [sidebarLayout, setSidebarLayout] = useState([]);

  useEffect(() => {
    const loadLayout = () => {
      setSidebarLayout(getSidebarLayout());
    };
    loadLayout();
    window.addEventListener('sidebar-layout-sync', loadLayout);
    return () => window.removeEventListener('sidebar-layout-sync', loadLayout);
  }, []);

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

  const renderIcon = (iconName, size, className) => {
    const IconComponent = Icons[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={size} className={className} />;
  };

  const renderSidebarItem = (item) => {
    if (item.hidden) return null;

    // Admin Panel super admin check
    if (item.isSuperAdmin && !isSuperAdmin) return null;

    // Check collapsible item
    if (item.type === 'collapsible') {
      const isCollapsibleActive = item.children.some(child => isActive(child.path));
      let isOpen = false;
      let setOpen = null;

      if (item.id === 'quotes_proformas') {
        isOpen = quotesOpen;
        setOpen = setQuotesOpen;
      } else if (item.id === 'payroll_group') {
        isOpen = payrollOpen;
        setOpen = setPayrollOpen;
      } else if (item.id === 'accounts_group') {
        isOpen = accountsOpen;
        setOpen = setAccountsOpen;
      } else if (item.id === 'reports_group') {
        isOpen = reportsOpen;
        setOpen = setReportsOpen;
      }

      const handleToggle = (e) => {
        if (item.isPremium && !hasPremiumAccess) {
          handlePremiumClick(e);
        } else if (setOpen) {
          setOpen(o => !o);
        }
      };

      return (
        <div key={item.id} className="w-full">
          <button
            onClick={handleToggle}
            className={`flex items-center justify-between px-[18px] py-[5px] text-[12px] font-medium transition-colors w-full border-l-2
              ${isCollapsibleActive
                ? 'bg-white/10 text-white border-blue-400'
                : 'text-slate-300 hover:bg-white/5 hover:text-white border-transparent'}`}
          >
            <span className="flex items-center gap-[9px]">
              {renderIcon(item.iconName, ICON_SIZE)} {item.label}
              {item.isPremium && !hasPremiumAccess && (
                <span className="text-[8px] font-bold bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded uppercase ml-1">Pro</span>
              )}
            </span>
            {isOpen
              ? <FaChevronDown size={10} className="text-slate-400" />
              : <FaChevronRight size={10} className="text-slate-400" />}
          </button>

          {isOpen && (item.isPremium ? hasPremiumAccess : true) && (
            <div className="bg-black/10">
              {item.children.map(child => {
                const isChildActive = isActive(child.path, child.path === '/payroll');
                return (
                  <Link
                    key={child.id}
                    to={child.path}
                    className={subLinkCls(child.path)}
                  >
                    <FaMinus size={9} className="text-slate-500" /> {child.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Special styling for Upgrade
    if (item.isSpecial) {
      return (
        <Link key={item.id} to={item.path} className={linkCls(item.path)}>
          <div className="flex items-center gap-[9px] text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 font-bold tracking-wide">
            {renderIcon(item.iconName, ICON_SIZE, "text-amber-400")} {item.label}
          </div>
        </Link>
      );
    }

    // Default item
    return (
      <Link key={item.id} to={item.path} className={linkCls(item.path)}>
        {renderIcon(item.iconName, ICON_SIZE)} {item.label}
      </Link>
    );
  };

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
          {sidebarLayout.map(section => {
            if (section.hidden) return null;
            
            // Check if all items in this section are hidden or super admin restricted
            const hasVisibleItems = section.items.some(item => {
              if (item.hidden) return false;
              if (item.isSuperAdmin && !isSuperAdmin) return false;
              return true;
            });

            if (!hasVisibleItems) return null;

            return (
              <div key={section.id} className="mb-2">
                <div className="px-[18px] pt-[10px] pb-[4px] text-[9px] font-bold text-slate-400/80 tracking-wider uppercase">
                  {section.title}
                </div>
                {section.items.map(item => renderSidebarItem(item))}
              </div>
            );
          })}
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

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Package,
  ShoppingBag,
  ShoppingCart,
  Clock,
  Landmark,
  UserCheck,
  Users,
  BarChart3,
  Folder,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Sparkles,
  Lock,
  X,
  FileText,
  ClipboardList,
  TrendingUp,
  Repeat,
  Truck,
  Receipt,
  Layers,
  Building2,
  Banknote,
  Calculator,
  Settings as SettingsIcon,
  Scale,
  Tags,
  CreditCard,
  Wallet,
  Inbox,
  Trash2,
  Shield,
  LayoutGrid,
  Sun,
  Moon
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import * as Icons from 'react-icons/fa';
import api, { clearAuthSession } from '../api/axios';
import { getSidebarLayout } from '../utils/sidebarConfig';
import { getStoredTheme, setGlobalTheme } from '../utils/theme';

const ICON_SIZE = 16;

// Precise icon map matching the Zoho reference icons
const ICON_MAP = {
  // Direct item IDs
  dashboard: Home,
  bank_statement: Landmark,
  clients: Users,
  invoices: FileText,
  quotes_proformas: ClipboardList,
  incomes: TrendingUp,
  recurring: Repeat,
  vendors: Truck,
  purchase_orders: ShoppingCart,
  expenses: Receipt,
  inventory: ShoppingBag,
  assets: Landmark,
  projects: Layers,
  business_units: Building2,
  payroll_dashboard: Banknote,
  employees: Users,
  payroll_process: Calculator,
  payroll_calculator: Calculator,
  payroll_reports: BarChart3,
  payroll_settings: SettingsIcon,
  payroll_portal: UserCheck,
  budgets: Scale,
  categories: Tags,
  liabilities: CreditCard,
  accounts_group: Wallet,
  reports_group: BarChart3,
  submissions_inbox: Inbox,
  recycle_bin: Trash2,
  team_settings: Users,
  upgrade: Sparkles,
  settings: SettingsIcon,
  admin_panel: Lock,

  // Fallback mappings by Fa icon names
  FaThLarge: Home,
  FaHome: Home,
  FaBox: ShoppingBag,
  FaShoppingCart: ShoppingCart,
  FaShoppingBag: ShoppingBag,
  FaClock: Clock,
  FaUniversity: Landmark,
  FaLandmark: Landmark,
  FaUserTie: UserCheck,
  FaUser: UserCheck,
  FaUsers: Users,
  FaChartBar: BarChart3,
  FaFolder: Folder,
  FaFileInvoice: FileText,
  FaClipboardList: ClipboardList,
  FaPlus: TrendingUp,
  FaMinus: Receipt,
  FaRedo: Repeat,
  FaTruck: Truck,
  FaBuilding: Building2,
  FaProjectDiagram: Layers,
  FaMoneyBillWave: Banknote,
  FaCalculator: Calculator,
  FaBalanceScale: Scale,
  FaTags: Tags,
  FaCreditCard: CreditCard,
  FaWallet: Wallet,
  FaInbox: Inbox,
  FaTrash: Trash2,
  FaStar: Sparkles,
  FaCog: SettingsIcon,
  FaLock: Lock,

  // Direct Lucide Icon Names from sidebarConfig
  Home: Home,
  Package: Package,
  ShoppingCart: ShoppingCart,
  ShoppingBag: ShoppingBag,
  Clock: Clock,
  Landmark: Landmark,
  UserCheck: UserCheck,
  BarChart3: BarChart3,
  Folder: Folder,
  Users: Users,
  Settings: SettingsIcon,
  Trash: Trash2,
  Star: Sparkles,
  Lock: Lock,
};

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Premium Modal State
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Dark Mode Synchronization
  const [isDark, setIsDark] = useState(getStoredTheme);

  useEffect(() => {
    const handleThemeSync = (e) => {
      if (e.detail && typeof e.detail.isDark === 'boolean') {
        setIsDark(e.detail.isDark);
      } else {
        setIsDark(getStoredTheme());
      }
    };
    window.addEventListener('app-theme-sync', handleThemeSync);
    window.addEventListener('storage', handleThemeSync);
    return () => {
      window.removeEventListener('app-theme-sync', handleThemeSync);
      window.removeEventListener('storage', handleThemeSync);
    };
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    setGlobalTheme(next);
  };

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('flance_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('flance_sidebar_collapsed', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [popupStyles, setPopupStyles] = useState({});
  const [tooltip, setTooltip] = useState({ visible: false, text: '', rect: null });

  const calculatePopupStyle = (itemId, element) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    
    if (spaceBelow < 220) {
      setPopupStyles(prev => ({
        ...prev,
        [itemId]: {
          position: 'fixed',
          left: `${rect.right + 12}px`,
          bottom: `${window.innerHeight - rect.bottom}px`,
          top: 'auto'
        }
      }));
    } else {
      setPopupStyles(prev => ({
        ...prev,
        [itemId]: {
          position: 'fixed',
          left: `${rect.right + 12}px`,
          top: `${rect.top}px`,
          bottom: 'auto'
        }
      }));
    }
  };

  const showTooltip = (text, e) => {
    if (!isCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ visible: true, text, rect });
  };

  const hideTooltip = () => {
    setTooltip({ visible: false, text: '', rect: null });
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('aside')) {
        setActiveDropdown(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setActiveDropdown(null);
      hideTooltip();
    };
    const navEl = document.querySelector('nav');
    if (navEl) {
      navEl.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (navEl) {
        navEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isCollapsed]);

  useEffect(() => {
    setActiveDropdown(null);
    setPopupStyles({});
    hideTooltip();
  }, [isCollapsed]);

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
  let currentUser = null;
  try {
    const userStr = localStorage.getItem('user');
    const userObj = userStr ? JSON.parse(userStr).user : null;
    currentUser = userObj;
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

  // Collapsible Sidebar Sections
  const [collapsedSections, setCollapsedSections] = useState({});

  const isSectionActive = (section) => {
    return section.items.some(item => {
      if (item.hidden) return false;
      if (item.isSuperAdmin && !isSuperAdmin) return false;
      if (item.type === 'collapsible') {
        return item.children.some(child => isActive(child.path));
      }
      return isActive(item.path);
    });
  };

  const isSectionCollapsed = (section) => {
    if (isCollapsed) return false;
    const stateVal = collapsedSections[section.id];
    if (stateVal !== undefined) {
      return stateVal;
    }
    return !isSectionActive(section);
  };

  const toggleSection = (section) => {
    const isCurrentlyCollapsed = isSectionCollapsed(section);
    setCollapsedSections(prev => ({
      ...prev,
      [section.id]: !isCurrentlyCollapsed
    }));
  };

  const linkCls = (path) =>
    `flex items-center ${isCollapsed ? 'justify-center px-0 py-2' : 'justify-between mx-2 my-[1px] px-2.5 py-[6.5px]'} text-[13px] rounded-[6px] transition-all duration-150 cursor-pointer w-auto text-left relative group
    ${isActive(path)
      ? 'bg-[#2f70f6] text-white font-medium shadow-sm'
      : isDark
        ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
        : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-medium'}`;

  const subLinkCls = (path) =>
    `flex items-center justify-between pl-[34px] pr-2.5 py-[5.5px] mx-2 my-[1px] text-[12.5px] rounded-[6px] transition-colors w-auto text-left group
    ${isActive(path, path === '/payroll')
      ? 'bg-[#2f70f6] text-white font-medium shadow-sm'
      : isDark
        ? 'text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium'
        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'}`;

  const renderIcon = (item, size = 16, className = '') => {
    const IconComp =
      (item && ICON_MAP[item.id]) ||
      (item && ICON_MAP[item.iconName]) ||
      (typeof item === 'string' && (ICON_MAP[item] || Icons[item])) ||
      (item && Icons[item.iconName]) ||
      ShoppingBag;

    return <IconComp size={size} strokeWidth={1.8} className={className} />;
  };

  const renderSidebarItem = (item) => {
    if (item.hidden) return null;

    // Admin Panel super admin check
    if (item.isSuperAdmin && !isSuperAdmin) return null;

    const currentIconSize = isCollapsed ? 18 : 16;

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
        e.stopPropagation();
        const wrapper = e.currentTarget.closest('.group');
        calculatePopupStyle(item.id, wrapper);
        if (item.isPremium && !hasPremiumAccess) {
          handlePremiumClick(e);
        } else if (isCollapsed) {
          setActiveDropdown(prev => prev === item.id ? null : item.id);
        } else if (setOpen) {
          setOpen(o => !o);
        }
      };

      const isHighlighted = isCollapsibleActive || isOpen;

      return (
        <div
          key={item.id}
          className="w-full relative group my-[1px]"
          onMouseEnter={(e) => calculatePopupStyle(item.id, e.currentTarget)}
        >
          <button
            onClick={handleToggle}
            className={`flex items-center ${isCollapsed ? 'justify-center px-0 py-2' : 'justify-between mx-2 px-2.5 py-[6.5px]'} text-[13px] rounded-[6px] transition-all duration-150 w-auto
              ${isHighlighted
                ? isDark
                  ? 'bg-slate-800/80 text-white font-medium'
                  : 'bg-[#eff3fe] text-slate-950 font-medium'
                : isDark
                  ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                  : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950 font-medium'}`}
          >
            <span className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 flex-1 min-w-0'}`}>
              {!isCollapsed && (
                <span className="w-2.5 flex items-center justify-center flex-shrink-0">
                  {isOpen ? (
                    <ChevronDown size={11} strokeWidth={2.2} className={isHighlighted ? (isDark ? 'text-slate-300' : 'text-slate-700') : (isDark ? 'text-slate-400' : 'text-slate-500')} />
                  ) : (
                    <ChevronRight size={11} strokeWidth={2.2} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                  )}
                </span>
              )}
              {renderIcon(
                item,
                currentIconSize,
                isHighlighted 
                  ? (isDark ? 'text-blue-400 flex-shrink-0' : 'text-blue-600 flex-shrink-0') 
                  : (isDark ? 'text-slate-400 group-hover:text-slate-200 flex-shrink-0' : 'text-slate-600 group-hover:text-slate-800 flex-shrink-0')
              )}
              {!isCollapsed && <span className="truncate text-left">{item.label}</span>}
              {!isCollapsed && item.isPremium && !hasPremiumAccess && (
                <span className="text-[8px] font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded uppercase ml-auto">Pro</span>
              )}
            </span>
          </button>

          {/* Floating popup sub-menu for collapsed state */}
          {isCollapsed && (item.isPremium ? hasPremiumAccess : true) && (
            <div
              className={`fixed ml-2 rounded-xl shadow-2xl border py-2 w-48 z-50 ${(activeDropdown === item.id) ? 'block' : 'hidden group-hover:block'} ${
                isDark ? 'bg-[#0f172a] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
              style={popupStyles[item.id] || { display: 'none' }}
            >
              <div className={`px-3 py-1.5 text-[11px] font-bold border-b mb-1 uppercase tracking-wider text-left ${
                isDark ? 'text-slate-400 border-slate-800' : 'text-slate-600 border-slate-100'
              }`}>
                {item.label}
              </div>
              {item.children.map(child => (
                <Link
                  key={child.id}
                  to={child.path}
                  onClick={() => setActiveDropdown(null)}
                  className={`flex items-center justify-between px-3 py-1.5 text-[12px] rounded-md mx-1 my-0.5 transition-colors text-left ${
                    isActive(child.path) 
                      ? 'bg-[#2f70f6] text-white font-medium shadow-sm' 
                      : isDark
                        ? 'text-slate-300 font-medium hover:bg-slate-800 hover:text-blue-400'
                        : 'text-slate-800 font-medium hover:bg-slate-100 hover:text-blue-600'
                  }`}
                >
                  <span className="truncate">{child.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Inline submenu for expanded state */}
          {!isCollapsed && isOpen && (item.isPremium ? hasPremiumAccess : true) && (
            <div className="py-0.5 space-y-[1px]">
              {item.children.map(child => {
                return (
                  <Link
                    key={child.id}
                    to={child.path}
                    className={subLinkCls(child.path)}
                  >
                    <span className="truncate">{child.label}</span>
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
        <Link
          key={item.id}
          to={item.path}
          className={`flex items-center ${isCollapsed ? 'justify-center px-0 py-2' : 'justify-between mx-2 my-[1px] px-2.5 py-[6.5px]'} text-[13px] rounded-[6px] transition-all duration-150 cursor-pointer w-auto text-left relative group ${
            isActive(item.path)
              ? 'bg-[#2f70f6] text-white font-medium shadow-sm'
              : isDark
                ? 'bg-gradient-to-r from-amber-950/40 to-orange-950/40 text-amber-300 hover:from-amber-950/60 hover:to-orange-950/60 border border-amber-800/50 font-semibold'
                : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 hover:from-amber-100 hover:to-orange-100 border border-amber-200/60 font-semibold'
          }`}
          onMouseEnter={(e) => showTooltip(item.label, e)}
          onMouseLeave={hideTooltip}
          onClick={hideTooltip}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 flex-1 min-w-0'}`}>
            {!isCollapsed && <span className="w-2.5 flex-shrink-0" />}
            {renderIcon(item, currentIconSize, isActive(item.path) ? "text-white flex-shrink-0" : "text-amber-500 flex-shrink-0")}
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </div>
        </Link>
      );
    }

    // Default item
    const itemActive = isActive(item.path);
    return (
      <Link
        key={item.id}
        to={item.path}
        className={linkCls(item.path)}
        onMouseEnter={(e) => showTooltip(item.label, e)}
        onMouseLeave={hideTooltip}
        onClick={hideTooltip}
      >
        <span className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 flex-1 min-w-0'}`}>
          {!isCollapsed && <span className="w-2.5 flex-shrink-0" />}
          {renderIcon(
            item,
            currentIconSize,
            itemActive 
              ? 'text-white flex-shrink-0' 
              : isDark
                ? 'text-slate-400 group-hover:text-slate-200 flex-shrink-0'
                : 'text-slate-600 group-hover:text-slate-800 flex-shrink-0'
          )}
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </span>
      </Link>
    );
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${
      isDark ? 'bg-[#090d16] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>

      {/* ── Sidebar ── */}
      <aside
        className={`h-full flex-shrink-0 hidden md:flex flex-col relative transition-all duration-200 ease-in-out border-r ${
          isDark 
            ? 'bg-[#0f172a] border-slate-800/90 shadow-xl' 
            : 'bg-white border-slate-200/90'
        } ${
          isCollapsed ? 'w-[64px]' : 'w-[224px]'
        }`}
      >

        {/* Floating circular expand/collapse toggle button on divider */}
        <button
          onClick={toggleSidebar}
          className={`absolute -right-3 top-5 w-6 h-6 rounded-full flex items-center justify-center border shadow-sm transition-all duration-200 z-50 cursor-pointer ${
            isDark 
              ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700 shadow-md' 
              : 'bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-slate-200'
          }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={12} strokeWidth={2.2} /> : <ChevronLeft size={12} strokeWidth={2.2} />}
        </button>

        {/* Brand Header */}
        <div className={`px-3.5 py-3 border-b flex items-center min-h-[56px] ${
          isDark ? 'bg-[#0f172a] border-slate-800/80' : 'bg-white border-slate-200/80'
        }`}>
          {!isCollapsed ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <LayoutGrid size={15} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <h1 className={`text-[15px] font-bold leading-none tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Flance
                  </h1>
                  {hasPremiumAccess && (
                    <span className={`text-[9px] font-semibold tracking-wider uppercase mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      {isSuperAdmin ? 'Super Admin' : 'Pro Plan'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <LayoutGrid size={15} strokeWidth={2} />
              </div>
            </div>
          )}
        </div>

        {/* Nav list */}
        <nav className="flex-1 py-2 overflow-y-auto sidebar-scroll">
          {sidebarLayout.map(section => {
            if (section.hidden) return null;
            
            // Check if all items in this section are hidden or super admin restricted
            const hasVisibleItems = section.items.some(item => {
              if (item.hidden) return false;
              if (item.isSuperAdmin && !isSuperAdmin) return false;
              return true;
            });

            if (!hasVisibleItems) return null;

            const isSectionCollapsedState = isSectionCollapsed(section);

            return (
              <div key={section.id} className="mb-1.5">
                {!isCollapsed ? (
                  <button
                    onClick={() => toggleSection(section)}
                    className={`w-full flex items-center justify-between px-3.5 pt-2 pb-1 text-[10.5px] font-bold tracking-wider uppercase transition-colors duration-150 focus:outline-none text-left select-none ${
                      isDark 
                        ? 'text-slate-400 hover:text-slate-200' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{section.title}</span>
                    <ChevronDown 
                      size={11} 
                      strokeWidth={2.2}
                      className={`transform transition-transform duration-200 ${
                        isSectionCollapsedState ? '-rotate-90 text-slate-500' : 'text-slate-500'
                      }`} 
                    />
                  </button>
                ) : (
                  <hr className={`my-2 mx-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`} />
                )}
                {!isSectionCollapsedState && section.items.map(item => renderSidebarItem(item))}
              </div>
            );
          })}
        </nav>

        {/* Bottom Bar (User Profile, Theme Toggle & Logout) */}
        <div className={`border-t p-2 flex flex-col gap-1.5 ${
          isDark ? 'border-slate-800/80 bg-[#0b1120]' : 'border-slate-200/80 bg-slate-50/50'
        }`}>
          {currentUser && (
            <Link
              to="/settings?tab=software"
              className={`flex items-center ${isCollapsed ? 'justify-center p-1' : 'gap-2 px-2 py-1.5'} rounded-lg transition-colors group text-left ${
                isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-200/60'
              }`}
              title="Account Settings"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-200/40 bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{String(currentUser.username || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className={`text-[12px] font-semibold truncate leading-tight group-hover:text-blue-500 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {currentUser.username}
                  </span>
                  <span className={`text-[10px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {currentUser.email}
                  </span>
                </div>
              )}
            </Link>
          )}

          {!isCollapsed ? (
            <div className="flex items-center justify-between px-2.5 py-0.5">
              <span className={`text-[10px] font-bold tracking-wider uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Theme & App
              </span>
              <div className="flex items-center gap-1">
                {/* Theme Switcher Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`p-1 rounded transition-colors ${
                    isDark 
                      ? 'text-amber-400 hover:text-amber-300 hover:bg-slate-800' 
                      : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200/70'
                  }`}
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {isDark ? <Sun size={13} strokeWidth={2} /> : <Moon size={13} strokeWidth={2} />}
                </button>
                <button
                  onClick={toggleSidebar}
                  className={`p-1 rounded transition-colors ${
                    isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
                  }`}
                  title="Collapse Sidebar"
                >
                  <ChevronLeft size={12} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center p-1.5 rounded-md transition-colors w-full ${
                isDark 
                  ? 'text-amber-400 hover:text-amber-300 hover:bg-slate-800' 
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200/70'
              }`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
            </button>
          )}

          <button
            onClick={async (e) => {
              hideTooltip();
              try {
                await api.post('/auth/logout');
              } catch (err) {
                console.error('Logout failed', err);
              }
              clearAuthSession();
              window.location.href = '/login';
            }}
            onMouseEnter={(e) => showTooltip('Logout', e)}
            onMouseLeave={hideTooltip}
            data-testid="logout-button"
            className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-2 px-2.5'} py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 w-full ${
              isDark 
                ? 'text-slate-400 hover:text-red-400 hover:bg-red-950/30' 
                : 'text-slate-600 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <LogOut size={isCollapsed ? 16 : 14} strokeWidth={1.8} />
            {!isCollapsed && <span>Logout</span>}
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
                <X size={16} strokeWidth={2} />
              </button>
              <div className="bg-white/20 p-4 rounded-full backdrop-blur-md shadow-inner">
                <Lock className="w-10 h-10 text-white" strokeWidth={1.8} />
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
                  Upgrade Now <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />
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

      {/* Global Tooltip for Collapsed Sidebar */}
      {tooltip.visible && tooltip.rect && (
        <div
          className="fixed bg-slate-900 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-md shadow-lg pointer-events-none z-50 whitespace-nowrap"
          style={{
            left: `${tooltip.rect.right + 12}px`,
            top: `${tooltip.rect.top + (tooltip.rect.height / 2) - 12}px`
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default Layout;

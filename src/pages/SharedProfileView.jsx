import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Lock,
  Eye,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Users,
  Building2,
  Building,
  FolderKanban,
  PieChart,
  ShieldAlert,
  Briefcase,
  Landmark,
  Repeat,
  Tag,
  Wallet,
  Inbox,
  BarChart3,
} from 'lucide-react';
import { getPublicShareMetadata } from '../services/profileShareService';
import { setActiveProfileId } from '../services/clientProfileService';

export default function SharedProfileView() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareData, setShareData] = useState(null);
  const [requiresPasscode, setRequiresPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const loadShare = async (candidatePasscode = null) => {
    setLoading(true);
    setPasscodeError('');
    setError('');
    try {
      const activePasscode = candidatePasscode || sessionStorage.getItem(`sharePasscode_${token}`);
      const data = await getPublicShareMetadata(token, activePasscode);
      setShareData(data);
      setRequiresPasscode(false);

      if (activePasscode) {
        sessionStorage.setItem(`sharePasscode_${token}`, activePasscode);
      }

      // Store security boundary state in sessionStorage
      if (data.token) {
        sessionStorage.setItem('token', data.token);
      }
      sessionStorage.setItem('shareLinkToken', token);
      const accessLevel = data.rules?.accessLevel || 'VIEW_ONLY';
      sessionStorage.setItem('isSharedSession', 'true');
      sessionStorage.setItem('shareAccessLevel', accessLevel);
      sessionStorage.setItem('isSharedViewOnly', accessLevel === 'VIEW_ONLY' ? 'true' : 'false');
      sessionStorage.setItem('activeProfileId', data.profile._id);
      setActiveProfileId(data.profile._id);
      if (data.watermark) {
        sessionStorage.setItem('shareWatermark', data.watermark);
      }
      if (data.rules) {
        sessionStorage.setItem('shareRules', JSON.stringify(data.rules));
      }
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.requiresPasscode) {
        setRequiresPasscode(true);
        if (candidatePasscode) {
          setPasscodeError(err.response?.data?.message || 'Invalid passcode');
          sessionStorage.removeItem(`sharePasscode_${token}`);
        }
      } else {
        setError(err.response?.data?.message || 'Unable to access shared workspace');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShare();
  }, [token]);

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    loadShare(passcode.trim());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">Connecting to shared workspace...</p>
        </div>
      </div>
    );
  }

  // Passcode Challenge Screen
  if (requiresPasscode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            Protected Workspace
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Enter the passcode provided by the workspace owner to view this profile.
          </p>

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Enter passcode"
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-center font-mono tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {passcodeError && (
              <p className="text-xs text-red-500 font-medium">{passcodeError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
            >
              Unlock Workspace
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error || !shareData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-xs text-slate-500 mb-4">{error || 'Share link is invalid or expired'}</p>
        </div>
      </div>
    );
  }

  const { profile, rules, watermark } = shareData;
  const isCanEdit = rules?.accessLevel === 'CAN_EDIT';
  const modulePerms = rules?.modulePermissions || {};
  const allowedModules = rules?.modules || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sticky Watermark Header */}
      {isCanEdit ? (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-sm">
          <ShieldCheck size={16} />
          <span>COLLABORATOR ACCESS (Can Edit) — {watermark || `${profile.name} (Collaborator)`}</span>
        </div>
      ) : (
        <div className="bg-amber-500 text-slate-950 text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-sm">
          <ShieldCheck size={16} />
          <span>VIEW-ONLY MODE — {watermark || `${profile.name} (Shared)`}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        {/* Workspace Card */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: profile.color || '#3b82f6' }}
            >
              {profile.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {profile.name}
                  {profile.code && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                      {profile.code}
                    </span>
                  )}
                </h1>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isCanEdit
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {isCanEdit ? 'Collaborator Access' : 'View-Only'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isCanEdit
                  ? 'Collaborator workspace • You can create and edit records in permitted modules • Sensitive fields redacted'
                  : 'Shared view-only access • Sensitive fields like salaries and bank details are redacted'}
              </p>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Available Modules ({allowedModules.length})
        </h2>

        {allowedModules.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            No specific modules were assigned to this share link.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allowedModules.map((modKey) => {
              const canEditThisMod = isCanEdit && modulePerms[modKey] !== 'view';
              const routeMap = {
                // Commercial & Sales
                invoices: { title: 'Invoices', path: '/invoices', icon: FileText, desc: 'Sales invoices & billing' },
                quotes: { title: 'Quotations', path: '/quotes', icon: FileText, desc: 'Cost estimates & proposals' },
                proformas: { title: 'Proformas', path: '/proformas', icon: FileText, desc: 'Proforma invoices' },
                purchaseOrders: { title: 'Purchase Orders', path: '/purchase-orders', icon: Package, desc: 'Vendor orders & procurement' },
                clients: { title: 'Clients', path: '/clients', icon: Users, desc: 'Customer directories' },
                vendors: { title: 'Vendors', path: '/vendors', icon: Building2, desc: 'Supplier & vendor contacts' },
                items: { title: 'Items & Products', path: '/items', icon: Package, desc: 'Products & inventory list' },

                // Accounting & Finance
                expenses: { title: 'Expenses', path: '/expenses', icon: DollarSign, desc: 'Tracked business expenses' },
                incomes: { title: 'Incomes', path: '/incomes', icon: TrendingUp, desc: 'Recorded income streams' },
                income: { title: 'Incomes', path: '/incomes', icon: TrendingUp, desc: 'Recorded income streams' },
                recurringTransactions: { title: 'Recurring Transactions', path: '/recurring', icon: Repeat, desc: 'Recurring income & expense schedules' },
                bankStatements: { title: 'Bank Statements', path: '/bank-statement', icon: Landmark, desc: 'Bank statement feeds & reconciliations' },
                categories: { title: 'Categories', path: '/categories', icon: Tag, desc: 'Expense & income classifications' },

                // Assets & Liabilities
                budgets: { title: 'Budgets', path: '/budgets', icon: PieChart, desc: 'Budget allocation & variance' },
                liabilities: { title: 'Liabilities', path: '/liabilities', icon: ShieldAlert, desc: 'Debts & loans payable' },
                assets: { title: 'Fixed Assets', path: '/assets', icon: Briefcase, desc: 'Asset logs & valuations' },

                // Operations & Projects
                projects: { title: 'Projects', path: '/projects', icon: FolderKanban, desc: 'Project milestones & tracking' },
                businessUnits: { title: 'Business Units', path: '/business-units', icon: Building, desc: 'Branches & business units' },
                departments: { title: 'Departments', path: '/business-units', icon: Layers, desc: 'Organizational divisions' },

                // HR & Payroll
                employees: { title: 'Employees', path: '/employees', icon: Users, desc: 'Staff directory & profiles' },
                payroll: { title: 'Payroll', path: '/payroll', icon: Wallet, desc: 'Payroll overview & payslips' },
                leaves: { title: 'Leaves & Attendance', path: '/payroll', icon: Calendar, desc: 'Staff leave tracking' },
                reimbursements: { title: 'Reimbursements', path: '/payroll', icon: DollarSign, desc: 'Employee expense claims' },
                loans: { title: 'Employee Loans', path: '/payroll', icon: DollarSign, desc: 'Advances & loans ledger' },

                // Reports & Portals
                financialReports: { title: 'Financial Reports', path: '/dashboard', icon: BarChart3, desc: 'Business dashboards & P&L' },
                reports: { title: 'Financial Reports', path: '/dashboard', icon: BarChart3, desc: 'Business dashboards & P&L' },
                publicSubmissions: { title: 'Submissions Inbox', path: '/submissions', icon: Inbox, desc: 'Portal submissions inbox' },
                documents: { title: 'Documents', path: '/company-documents', icon: FileText, desc: 'Company documents vault & records' },
                companyDocuments: { title: 'Documents', path: '/company-documents', icon: FileText, desc: 'Company documents vault & records' },
              };

              const item = routeMap[modKey] || {
                title: modKey.toUpperCase(),
                path: `/${modKey}`,
                icon: Layers,
                desc: 'Workspace module',
              };
              const Icon = item.icon;

              return (
                <button
                  key={modKey}
                  onClick={() => navigate(item.path)}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md transition-all text-left group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Icon size={20} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          canEditThisMod
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {canEditThisMod ? 'Can Edit' : 'View Only'}
                      </span>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

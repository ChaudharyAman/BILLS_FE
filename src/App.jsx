import React, { Suspense, lazy, useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PageLoader from './components/PageLoader';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import api, { clearAuthSession, storeAuthSession } from './api/axios';
import { Toaster } from 'react-hot-toast';
import { initGlobalTheme } from './utils/theme';

// Helper for resilient lazy loading with auto-reload on dynamic import failure
const lazyRetry = (importFn) =>
  lazy(async () => {
    const pageHasBeenReloaded = window.sessionStorage.getItem('page-has-been-reloaded');
    try {
      const component = await importFn();
      window.sessionStorage.removeItem('page-has-been-reloaded');
      return component;
    } catch (error) {
      if (!pageHasBeenReloaded) {
        window.sessionStorage.setItem('page-has-been-reloaded', 'true');
        window.location.reload();
      }
      throw error;
    }
  });

// Lazy Load Pages
const InvoiceList = lazyRetry(() => import('./pages/InvoiceList'));
const InvoiceForm = lazyRetry(() => import('./pages/InvoiceForm'));
const InvoicePrint = lazyRetry(() => import('./pages/InvoicePrint'));
const QuoteList = lazyRetry(() => import('./pages/QuoteList'));
const QuoteForm = lazyRetry(() => import('./pages/QuoteForm'));
const QuotePrint = lazyRetry(() => import('./pages/QuotePrint'));
const ProformaList = lazyRetry(() => import('./pages/ProformaList'));
const Login = lazyRetry(() => import('./pages/Login'));
const Signup = lazyRetry(() => import('./pages/Signup'));
const ClientList = lazyRetry(() => import('./pages/ClientList'));
const ClientForm = lazyRetry(() => import('./pages/ClientForm'));
const VendorList = lazyRetry(() => import('./pages/VendorList'));
const VendorForm = lazyRetry(() => import('./pages/VendorForm'));
const ItemList = lazyRetry(() => import('./pages/ItemList'));
const ItemForm = lazyRetry(() => import('./pages/ItemForm'));
const PurchaseOrderList = lazyRetry(() => import('./pages/PurchaseOrderList'));
const PurchaseOrderForm = lazyRetry(() => import('./pages/PurchaseOrderForm'));
const PurchaseOrderPrint = lazyRetry(() => import('./pages/PurchaseOrderPrint'));
const ExpenseList = lazyRetry(() => import('./pages/ExpenseList'));
const ExpenseForm = lazyRetry(() => import('./pages/ExpenseForm'));
const IncomeList = lazyRetry(() => import('./pages/IncomeList'));
const IncomeForm = lazyRetry(() => import('./pages/IncomeForm'));
const CategoryManagement = lazyRetry(() => import('./pages/CategoryManagement'));
const EmployeeList = lazyRetry(() => import('./pages/EmployeeList'));
const EmployeeForm = lazyRetry(() => import('./pages/EmployeeForm'));
const EmployeeDetails = lazyRetry(() => import('./pages/EmployeeDetails'));
const BulkSalaryRevision = lazyRetry(() => import('./pages/BulkSalaryRevision'));
const PayrollDashboard = lazyRetry(() => import('./pages/PayrollDashboard'));
const PayrollProcessing = lazyRetry(() => import('./pages/PayrollProcessing'));
const PayslipGeneration = lazyRetry(() => import('./pages/PayslipGeneration'));
const SalaryCalculator = lazyRetry(() => import('./pages/SalaryCalculator'));
const PayrollReports = lazyRetry(() => import('./pages/PayrollReports'));
const PayrollSettings = lazyRetry(() => import('./pages/PayrollSettings'));
const EmployeePortal = lazyRetry(() => import('./pages/EmployeePortal'));
const BudgetManager = lazyRetry(() => import('./pages/BudgetManager'));
const BudgetTracking = lazyRetry(() => import('./pages/BudgetTracking'));
const RecurringTransactions = lazyRetry(() => import('./pages/RecurringTransactions'));
const FinancialDashboard = lazyRetry(() => import('./pages/FinancialDashboard'));
const TaxDashboard = lazyRetry(() => import('./pages/TaxDashboard'));
const ProfitLossStatement = lazyRetry(() => import('./pages/ProfitLossStatement'));
const BalanceSheet = lazyRetry(() => import('./pages/BalanceSheet'));
const CashFlowStatement = lazyRetry(() => import('./pages/CashFlowStatement'));
const ProjectManager = lazyRetry(() => import('./pages/ProjectManager'));
const ProjectDashboard = lazyRetry(() => import('./pages/ProjectDashboard'));
const Settings = lazyRetry(() => import('./pages/Settings'));
const LiabilityManagement = lazyRetry(() => import('./pages/LiabilityManagement'));
const AssetManagement = lazyRetry(() => import('./pages/AssetManagement'));
const BusinessUnitManagement = lazyRetry(() => import('./pages/BusinessUnitManagement'));
const Subscription = lazyRetry(() => import('./pages/Subscription'));
const AdminDashboard = lazyRetry(() => import('./pages/AdminDashboard'));
const BankStatementDashboard = lazyRetry(() => import('./pages/BankStatementDashboard'));

// ── New: Public Submission Portal ────────────────────────────────────────────
const PublicSubmitPage = lazyRetry(() => import('./pages/PublicSubmitPage'));
const PublicSubmissionsInbox = lazyRetry(() => import('./pages/PublicSubmissionsInbox'));
const SubmissionsInboxLogin = lazyRetry(() => import('./pages/SubmissionsInboxLogin'));
const RecycleBin = lazyRetry(() => import('./pages/RecycleBin'));
const CompanyDocuments = lazyRetry(() => import('./pages/CompanyDocuments'));

// ── Team Members & RBAC ──────────────────────────────────────────────────────
const TeamSettings = lazyRetry(() => import('./pages/TeamSettings'));
const AccessRoleManagement = lazyRetry(() => import('./pages/AccessRoleManagement'));
const AcceptInvite = lazyRetry(() => import('./pages/AcceptInvite'));

// ── Client Profiles & View-Only Shares ───────────────────────────────────────
const ClientProfileManagement = lazyRetry(() => import('./pages/ClientProfileManagement'));
const ProfileShareSettings = lazyRetry(() => import('./pages/ProfileShareSettings'));
const SharedProfileView = lazyRetry(() => import('./pages/SharedProfileView'));

// Reports
const GstReport = lazyRetry(() => import('./pages/reports/GstReport'));
const TdsSummary = lazyRetry(() => import('./pages/reports/TdsSummary'));
const RevenueReport = lazyRetry(() => import('./pages/reports/RevenueReport'));

// Accounts
const PaymentCollection = lazyRetry(() => import('./pages/accounts/PaymentCollection'));
const AccountStatement = lazyRetry(() => import('./pages/accounts/AccountStatement'));

const SubmissionsInboxRoute = () => {
  const [authState, setAuthState] = useState('checking');

  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      try {
        const response = await api.get('/auth/me');
        if (isMounted) {
          storeAuthSession(response.data);
          setAuthState('authenticated');
        }
      } catch (error) {
        if (isMounted) {
          clearAuthSession();
          setAuthState('unauthenticated');
        }
      }
    };

    verifySession();

    const handleAuthSync = () => {
      if (isMounted) {
        verifySession();
      }
    };

    window.addEventListener('auth-sync', handleAuthSync);
    return () => {
      isMounted = false;
      window.removeEventListener('auth-sync', handleAuthSync);
    };
  }, []);

  if (authState === 'checking') {
    return <PageLoader />;
  }

  if (authState === 'unauthenticated') {
    return (
      <SubmissionsInboxLogin
        onLoginSuccess={() => {
          setAuthState('authenticated');
        }}
      />
    );
  }

  return (
    <Layout>
      <PublicSubmissionsInbox />
    </Layout>
  );
};

const getFirstAllowedSharedPath = () => {
  try {
    const isShared =
      sessionStorage.getItem('isSharedSession') === 'true' ||
      sessionStorage.getItem('isSharedViewOnly') === 'true' ||
      localStorage.getItem('isSharedViewOnly') === 'true';
    if (!isShared) return '/dashboard';
    const rulesStr = sessionStorage.getItem('shareRules');
    const rules = rulesStr ? JSON.parse(rulesStr) : null;
    const mods = rules?.modules || [];

    // If dashboard/reports is allowed, stay on dashboard
    if (mods.includes('reports') || mods.includes('financialReports')) {
      return '/dashboard';
    }

    const pathMap = {
      invoices: '/invoices',
      quotes: '/quotes',
      proformas: '/proformas',
      purchaseOrders: '/purchase-orders',
      expenses: '/expenses',
      incomes: '/incomes',
      income: '/incomes',
      items: '/items',
      clients: '/clients',
      vendors: '/vendors',
      employees: '/employees',
      payroll: '/payroll',
      budgets: '/budgets',
      recurringTransactions: '/recurring',
      bankStatements: '/bank-statement',
      categories: '/categories',
      liabilities: '/liabilities',
      assets: '/assets',
      projects: '/projects',
      businessUnits: '/business-units',
      publicSubmissions: '/submissions',
    };

    for (const m of mods) {
      if (pathMap[m]) return pathMap[m];
    }

    const token = sessionStorage.getItem('shareLinkToken');
    return token ? `/shared/${token}` : '/dashboard';
  } catch {
    return '/dashboard';
  }
};

const AdminRoute = ({ children }) => {
  const isShared =
    sessionStorage.getItem('isSharedSession') === 'true' ||
    sessionStorage.getItem('isSharedViewOnly') === 'true' ||
    localStorage.getItem('isSharedViewOnly') === 'true';
  if (isShared) {
    const target = getFirstAllowedSharedPath();
    return <Navigate to={target} replace />;
  }

  const userStr = localStorage.getItem('user');
  let role = '';
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      const user = parsed.user || parsed;
      role = user?.role || '';
    } catch (_) {}
  }
  if (role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const DashboardRoute = () => {
  const isShared =
    sessionStorage.getItem('isSharedSession') === 'true' ||
    sessionStorage.getItem('isSharedViewOnly') === 'true' ||
    localStorage.getItem('isSharedViewOnly') === 'true';
  if (isShared) {
    let allowed = false;
    try {
      const rulesStr = sessionStorage.getItem('shareRules');
      const rules = rulesStr ? JSON.parse(rulesStr) : null;
      const mods = rules?.modules || [];
      allowed = mods.includes('reports') || mods.includes('financialReports');
    } catch {}

    if (!allowed) {
      const target = getFirstAllowedSharedPath();
      return <Navigate to={target} replace />;
    }
  }
  return <FinancialDashboard />;
};

const RootRoute = () => {
  const isShared =
    sessionStorage.getItem('isSharedSession') === 'true' ||
    sessionStorage.getItem('isSharedViewOnly') === 'true' ||
    localStorage.getItem('isSharedViewOnly') === 'true';
  if (isShared) {
    const target = getFirstAllowedSharedPath();
    return <Navigate to={target} replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

const SharedModuleRoute = ({ module, action = 'view', fallback, children }) => {
  const isShared =
    sessionStorage.getItem('isSharedSession') === 'true' ||
    sessionStorage.getItem('isSharedViewOnly') === 'true' ||
    localStorage.getItem('isSharedViewOnly') === 'true';

  if (isShared) {
    let rules = null;
    try {
      const stored = sessionStorage.getItem('shareRules');
      rules = stored ? JSON.parse(stored) : null;
    } catch {}

    const mods = rules?.modules || [];
    const isModuleAllowed =
      mods.length === 0 ||
      mods.includes(module) ||
      (module === 'reports' && (mods.includes('reports') || mods.includes('financialReports'))) ||
      (module === 'financialReports' && (mods.includes('reports') || mods.includes('financialReports'))) ||
      (module === 'income' && (mods.includes('income') || mods.includes('incomes'))) ||
      (module === 'incomes' && (mods.includes('income') || mods.includes('incomes')));

    if (!isModuleAllowed) {
      return <Navigate to={getFirstAllowedSharedPath()} replace />;
    }

    const accessLevel = rules?.accessLevel || sessionStorage.getItem('shareAccessLevel') || 'VIEW_ONLY';
    const isViewOnly = accessLevel === 'VIEW_ONLY';

    if (action !== 'view') {
      if (isViewOnly) {
        return <Navigate to={fallback || `/${module}`} replace />;
      }
      if (action === 'delete') {
        return <Navigate to={fallback || `/${module}`} replace />;
      }
      if (rules?.modulePermissions?.[module] === 'view') {
        return <Navigate to={fallback || `/${module}`} replace />;
      }
    }
  }

  return children;
};

function App() {

  // Storage Migrator: The old Login.jsx saved `response.data.user` directly as `{ username: 'xxx' }`. 
  // But Layout.jsx and other components expect `{ user: { username: 'xxx' } }`.
  // If we detect the unwrapped version, wrap it once on mount.
  useEffect(() => {
    initGlobalTheme();
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        // If it has an _id but no wrapper, it's the raw format.
        if (parsed._id && !parsed.user) {
          localStorage.setItem('user', JSON.stringify({ user: parsed }));
        }
      } catch (e) {
        console.warn("Could not migrate local storage", e);
      }
    }
  }, []);

  // Background Sync for Subscription Status
  useEffect(() => {
    const syncSubscription = async () => {
      if (document.visibilityState !== 'visible') return;

      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      try {
        const userObj = JSON.parse(userStr);
        if (!userObj || !userObj.user) return;

        const res = await api.get('/subscriptions/status');
        const { subscription: dbSub, role: dbRole } = res.data;

        // If the database has a newer state, sync it into localStorage
        const localSub = userObj.user.subscription;
        const localRole = userObj.user.role;

        const hasSubChanged = dbSub && (
          localSub?.plan !== dbSub.plan ||
          localSub?.status !== dbSub.status ||
          localSub?.billingCycle !== dbSub.billingCycle
        );
        const hasRoleChanged = dbRole && localRole !== dbRole;

        if (hasSubChanged || hasRoleChanged) {
          if (dbSub) userObj.user.subscription = dbSub;
          if (dbRole) userObj.user.role = dbRole;

          localStorage.setItem('user', JSON.stringify(userObj));
          // Dispatch a custom event so other components (like Sidebars/QuotaUI) can re-render immediately if needed
          window.dispatchEvent(new Event('auth-sync'));
        }
      } catch (err) {
        // Silently fail auth syncs if offline or token expired, PrivateRoute will handle real auth
        console.warn('Background subscription sync skipped:', err.message);
      }
    };

    syncSubscription();
    const intervalId = window.setInterval(syncSubscription, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', syncSubscription);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', syncSubscription);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const restoreSession = async () => {
      const isShared =
        sessionStorage.getItem('isSharedSession') === 'true' ||
        sessionStorage.getItem('isSharedViewOnly') === 'true' ||
        Boolean(sessionStorage.getItem('token'));
      if (isShared || window.location.pathname.startsWith('/shared/') || window.location.pathname.startsWith('/submit/')) {
        return;
      }
      const rawUser = localStorage.getItem('user');

      if (rawUser) return;

      try {
        const response = await api.get('/auth/me');
        if (!isCancelled) {
          storeAuthSession(response.data);
          window.dispatchEvent(new Event('auth-sync'));
        }
      } catch (error) {
        if (!isCancelled) {
          clearAuthSession();
        }
      }
    };

    restoreSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Toaster position="top-right" />
            <Routes>
              {/* Auth Routes - No Layout */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />

              {/* Public Submission Portal — no auth, no sidebar */}
              <Route path="/submit/:token" element={<PublicSubmitPage />} />

              {/* Public Shared Workspace View — unauthenticated / passcode gated */}
              <Route path="/shared/:token" element={<SharedProfileView />} />

              {/* Public Submissions Inbox with dedicated Google Sign-in gate */}
              <Route path="/submissions" element={<SubmissionsInboxRoute />} />

              <Route
                path="/invoices/:id/print"
                element={
                  <PrivateRoute>
                    <InvoicePrint />
                  </PrivateRoute>
                }
              />
              <Route
                path="/quotes/:id/print"
                element={
                  <PrivateRoute>
                    <QuotePrint docType="quote" />
                  </PrivateRoute>
                }
              />
              <Route
                path="/proformas/:id/print"
                element={
                  <PrivateRoute>
                    <QuotePrint docType="proforma" />
                  </PrivateRoute>
                }
              />
              <Route
                path="/purchase-orders/:id/print"
                element={
                  <PrivateRoute>
                    <PurchaseOrderPrint />
                  </PrivateRoute>
                }
              />

              {/* Main App Routes - With Layout & Protected */}
              <Route path="/*" element={
                <PrivateRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<RootRoute />} />
                      <Route path="/dashboard" element={<DashboardRoute />} />
                      <Route path="/tax-dashboard" element={<TaxDashboard />} />
                      <Route path="/bank-statement" element={<BankStatementDashboard />} />

                      {/* Invoices */}
                      <Route path="/invoices" element={<SharedModuleRoute module="invoices"><InvoiceList /></SharedModuleRoute>} />
                      <Route path="/invoices/new" element={<SharedModuleRoute module="invoices" action="create" fallback="/invoices"><InvoiceForm /></SharedModuleRoute>} />
                      <Route path="/invoices/edit/:id" element={<SharedModuleRoute module="invoices" action="edit" fallback="/invoices"><InvoiceForm /></SharedModuleRoute>} />

                      {/* Quotes */}
                      <Route path="/quotes" element={<SharedModuleRoute module="quotes"><QuoteList /></SharedModuleRoute>} />
                      <Route path="/quotes/new" element={<SharedModuleRoute module="quotes" action="create" fallback="/quotes"><QuoteForm docType="quote" /></SharedModuleRoute>} />
                      <Route path="/quotes/edit/:id" element={<SharedModuleRoute module="quotes" action="edit" fallback="/quotes"><QuoteForm docType="quote" /></SharedModuleRoute>} />

                      {/* Proformas */}
                      <Route path="/proformas" element={<SharedModuleRoute module="proformas"><ProformaList /></SharedModuleRoute>} />
                      <Route path="/proformas/new" element={<SharedModuleRoute module="proformas" action="create" fallback="/proformas"><QuoteForm docType="proforma" /></SharedModuleRoute>} />
                      <Route path="/proformas/edit/:id" element={<SharedModuleRoute module="proformas" action="edit" fallback="/proformas"><QuoteForm docType="proforma" /></SharedModuleRoute>} />

                      {/* Clients */}
                      <Route path="/clients" element={<SharedModuleRoute module="clients"><ClientList /></SharedModuleRoute>} />
                      <Route path="/clients/new" element={<SharedModuleRoute module="clients" action="create" fallback="/clients"><ClientForm /></SharedModuleRoute>} />
                      <Route path="/clients/edit/:id" element={<SharedModuleRoute module="clients" action="edit" fallback="/clients"><ClientForm /></SharedModuleRoute>} />

                      {/* Vendors */}
                      <Route path="/vendors" element={<SharedModuleRoute module="vendors"><VendorList /></SharedModuleRoute>} />
                      <Route path="/vendors/new" element={<SharedModuleRoute module="vendors" action="create" fallback="/vendors"><VendorForm /></SharedModuleRoute>} />
                      <Route path="/vendors/edit/:id" element={<SharedModuleRoute module="vendors" action="edit" fallback="/vendors"><VendorForm /></SharedModuleRoute>} />

                      <Route path="/items" element={<SharedModuleRoute module="items"><ItemList /></SharedModuleRoute>} />
                      <Route path="/items/new" element={<SharedModuleRoute module="items" action="create" fallback="/items"><ItemForm /></SharedModuleRoute>} />
                      <Route path="/items/edit/:id" element={<SharedModuleRoute module="items" action="edit" fallback="/items"><ItemForm /></SharedModuleRoute>} />

                      {/* Purchase Orders */}
                      <Route path="/purchase-orders" element={<SharedModuleRoute module="purchaseOrders"><PurchaseOrderList /></SharedModuleRoute>} />
                      <Route path="/purchase-orders/new" element={<SharedModuleRoute module="purchaseOrders" action="create" fallback="/purchase-orders"><PurchaseOrderForm /></SharedModuleRoute>} />
                      <Route path="/purchase-orders/edit/:id" element={<SharedModuleRoute module="purchaseOrders" action="edit" fallback="/purchase-orders"><PurchaseOrderForm /></SharedModuleRoute>} />

                      {/* Incomes */}
                      <Route path="/incomes" element={<SharedModuleRoute module="incomes"><IncomeList /></SharedModuleRoute>} />
                      <Route path="/incomes/new" element={<SharedModuleRoute module="incomes" action="create" fallback="/incomes"><IncomeForm /></SharedModuleRoute>} />
                      <Route path="/incomes/edit/:id" element={<SharedModuleRoute module="incomes" action="edit" fallback="/incomes"><IncomeForm /></SharedModuleRoute>} />

                      {/* Expenses */}
                      <Route path="/expenses" element={<SharedModuleRoute module="expenses"><ExpenseList /></SharedModuleRoute>} />
                      <Route path="/expenses/new" element={<SharedModuleRoute module="expenses" action="create" fallback="/expenses"><ExpenseForm /></SharedModuleRoute>} />
                      <Route path="/expenses/edit/:id" element={<SharedModuleRoute module="expenses" action="edit" fallback="/expenses"><ExpenseForm /></SharedModuleRoute>} />

                      {/* Finance Setup */}
                      <Route path="/categories" element={<CategoryManagement />} />
                      <Route path="/liabilities" element={<LiabilityManagement />} />
                      <Route path="/assets" element={<AssetManagement />} />
                      <Route path="/employees" element={<EmployeeList />} />
                      <Route path="/employees/new" element={<EmployeeForm />} />
                      <Route path="/employees/bulk-salary-revision" element={<BulkSalaryRevision />} />
                      <Route path="/employees/:id" element={<EmployeeDetails />} />
                      <Route path="/employees/:id/edit" element={<EmployeeForm />} />
                      <Route path="/payroll" element={<PayrollDashboard />} />
                      <Route path="/payroll/process" element={<PayrollProcessing />} />
                      <Route path="/payroll/calculator" element={<SalaryCalculator />} />
                      <Route path="/payroll/reports" element={<PayrollReports />} />
                      <Route path="/payroll/settings" element={<PayrollSettings />} />
                      <Route path="/payroll/portal" element={<EmployeePortal />} />
                      <Route path="/payroll/:id/payslip" element={<PayslipGeneration />} />
                      <Route path="/budgets" element={<BudgetManager />} />
                      <Route path="/budgets/tracking" element={<BudgetTracking />} />
                      <Route path="/recurring" element={<RecurringTransactions />} />
                      <Route path="/projects" element={<ProjectManager />} />
                      <Route path="/projects/dashboard" element={<ProjectDashboard />} />
                      <Route path="/business-units" element={<BusinessUnitManagement />} />

                      <Route path="/reports" element={<Navigate to="/dashboard" replace />} />

                      {/* Reports */}
                      <Route path="/reports/gst" element={<GstReport />} />
                      <Route path="/reports/tds" element={<TdsSummary />} />
                      <Route path="/reports/revenue" element={<RevenueReport />} />
                      <Route path="/reports/profit-loss" element={<ProfitLossStatement />} />
                      <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
                      <Route path="/reports/cash-flow" element={<CashFlowStatement />} />

                      {/* Accounts */}
                      <Route path="/accounts/payments" element={<PaymentCollection />} />
                      <Route path="/accounts/statements" element={<AccountStatement />} />

                      {/* Public Submissions Inbox */}
                      <Route path="/submissions" element={<PublicSubmissionsInbox />} />

                      <Route path="/subscription" element={<Subscription />} />
                      <Route path="/profiles" element={<Navigate to="/settings?tab=workspaces" replace />} />
                      <Route path="/profiles/:profileId/shares" element={<ProfileShareSettings />} />
                      <Route path="/company-documents" element={<CompanyDocuments />} />
                      <Route path="/documents" element={<Navigate to="/company-documents" replace />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/settings/team" element={<TeamSettings />} />
                      <Route path="/settings/roles" element={<AccessRoleManagement />} />
                      <Route path="/admin" element={
                        <AdminRoute>
                          <AdminDashboard />
                        </AdminRoute>
                      } />
                      <Route path="/recycle-bin" element={<RecycleBin />} />
                    </Routes>
                  </Layout>
                </PrivateRoute>
              } />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </Router>
  );
}

export default App;

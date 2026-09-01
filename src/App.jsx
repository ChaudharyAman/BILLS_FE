import React, { Suspense, lazy, useEffect } from 'react';
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
const RecycleBin = lazyRetry(() => import('./pages/RecycleBin'));

// ── Team Members & RBAC ──────────────────────────────────────────────────────
const TeamSettings = lazyRetry(() => import('./pages/TeamSettings'));
const AccessRoleManagement = lazyRetry(() => import('./pages/AccessRoleManagement'));
const AcceptInvite = lazyRetry(() => import('./pages/AcceptInvite'));

// Reports
const GstReport = lazyRetry(() => import('./pages/reports/GstReport'));
const TdsSummary = lazyRetry(() => import('./pages/reports/TdsSummary'));
const RevenueReport = lazyRetry(() => import('./pages/reports/RevenueReport'));

// Accounts
const PaymentCollection = lazyRetry(() => import('./pages/accounts/PaymentCollection'));
const AccountStatement = lazyRetry(() => import('./pages/accounts/AccountStatement'));

const AdminRoute = ({ children }) => {
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
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<FinancialDashboard />} />
                      <Route path="/tax-dashboard" element={<TaxDashboard />} />
                      <Route path="/bank-statement" element={<BankStatementDashboard />} />

                      {/* Invoices */}
                      <Route path="/invoices" element={<InvoiceList />} />
                      <Route path="/invoices/new" element={<InvoiceForm />} />
                      <Route path="/invoices/edit/:id" element={<InvoiceForm />} />

                      {/* Quotes */}
                      <Route path="/quotes" element={<QuoteList />} />
                      <Route path="/quotes/new" element={<QuoteForm docType="quote" />} />
                      <Route path="/quotes/edit/:id" element={<QuoteForm docType="quote" />} />

                      {/* Proformas */}
                      <Route path="/proformas" element={<ProformaList />} />
                      <Route path="/proformas/new" element={<QuoteForm docType="proforma" />} />
                      <Route path="/proformas/edit/:id" element={<QuoteForm docType="proforma" />} />

                      {/* Clients */}
                      <Route path="/clients" element={<ClientList />} />
                      <Route path="/clients/new" element={<ClientForm />} />
                      <Route path="/clients/edit/:id" element={<ClientForm />} />

                      {/* Vendors */}
                      <Route path="/vendors" element={<VendorList />} />
                      <Route path="/vendors/new" element={<VendorForm />} />
                      <Route path="/vendors/edit/:id" element={<VendorForm />} />

                      <Route path="/items" element={<ItemList />} />
                      <Route path="/items/new" element={<ItemForm />} />
                      <Route path="/items/edit/:id" element={<ItemForm />} />

                      {/* Purchase Orders */}
                      <Route path="/purchase-orders" element={<PurchaseOrderList />} />
                      <Route path="/purchase-orders/new" element={<PurchaseOrderForm />} />
                      <Route path="/purchase-orders/edit/:id" element={<PurchaseOrderForm />} />

                      {/* Incomes */}
                      <Route path="/incomes" element={<IncomeList />} />
                      <Route path="/incomes/new" element={<IncomeForm />} />
                      <Route path="/incomes/edit/:id" element={<IncomeForm />} />

                      {/* Expenses */}
                      <Route path="/expenses" element={<ExpenseList />} />
                      <Route path="/expenses/new" element={<ExpenseForm />} />
                      <Route path="/expenses/edit/:id" element={<ExpenseForm />} />

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

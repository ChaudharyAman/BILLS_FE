import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PageLoader from './components/PageLoader';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import api, { clearAuthSession, storeAuthSession } from './api/axios';

// Lazy Load Pages
const InvoiceList = lazy(() => import('./pages/InvoiceList'));
const InvoiceForm = lazy(() => import('./pages/InvoiceForm'));
const InvoicePrint = lazy(() => import('./pages/InvoicePrint'));
const QuoteList = lazy(() => import('./pages/QuoteList'));
const QuoteForm = lazy(() => import('./pages/QuoteForm'));
const QuotePrint = lazy(() => import('./pages/QuotePrint'));
const ProformaList = lazy(() => import('./pages/ProformaList'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ClientList = lazy(() => import('./pages/ClientList'));
const ClientForm = lazy(() => import('./pages/ClientForm'));
const VendorList = lazy(() => import('./pages/VendorList'));
const VendorForm = lazy(() => import('./pages/VendorForm'));
const ItemList = lazy(() => import('./pages/ItemList'));
const ItemForm = lazy(() => import('./pages/ItemForm'));
const PurchaseOrderList = lazy(() => import('./pages/PurchaseOrderList'));
const PurchaseOrderForm = lazy(() => import('./pages/PurchaseOrderForm'));
const PurchaseOrderPrint = lazy(() => import('./pages/PurchaseOrderPrint'));
const ExpenseList = lazy(() => import('./pages/ExpenseList'));
const ExpenseForm = lazy(() => import('./pages/ExpenseForm'));
const IncomeList = lazy(() => import('./pages/IncomeList'));
const IncomeForm = lazy(() => import('./pages/IncomeForm'));
const CategoryManagement = lazy(() => import('./pages/CategoryManagement'));
const EmployeeList = lazy(() => import('./pages/EmployeeList'));
const EmployeeForm = lazy(() => import('./pages/EmployeeForm'));
const EmployeeDetails = lazy(() => import('./pages/EmployeeDetails'));
const PayrollDashboard = lazy(() => import('./pages/PayrollDashboard'));
const PayrollProcessing = lazy(() => import('./pages/PayrollProcessing'));
const PayslipGeneration = lazy(() => import('./pages/PayslipGeneration'));
const SalaryCalculator = lazy(() => import('./pages/SalaryCalculator'));
const PayrollReports = lazy(() => import('./pages/PayrollReports'));
const PayrollSettings = lazy(() => import('./pages/PayrollSettings'));
const EmployeePortal = lazy(() => import('./pages/EmployeePortal'));
const BudgetManager = lazy(() => import('./pages/BudgetManager'));
const BudgetTracking = lazy(() => import('./pages/BudgetTracking'));
const RecurringTransactions = lazy(() => import('./pages/RecurringTransactions'));
const FinancialDashboard = lazy(() => import('./pages/FinancialDashboard'));
const ProfitLossStatement = lazy(() => import('./pages/ProfitLossStatement'));
const BalanceSheet = lazy(() => import('./pages/BalanceSheet'));
const CashFlowStatement = lazy(() => import('./pages/CashFlowStatement'));
const ProjectManager = lazy(() => import('./pages/ProjectManager'));
const ProjectDashboard = lazy(() => import('./pages/ProjectDashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Subscription = lazy(() => import('./pages/Subscription'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Reports
const GstReport = lazy(() => import('./pages/reports/GstReport'));
const RevenueReport = lazy(() => import('./pages/reports/RevenueReport'));

// Accounts
const PaymentCollection = lazy(() => import('./pages/accounts/PaymentCollection'));
const AccountStatement = lazy(() => import('./pages/accounts/AccountStatement'));

import { Toaster } from 'react-hot-toast';

function App() {
  
  // Storage Migrator: The old Login.jsx saved `response.data.user` directly as `{ username: 'xxx' }`. 
  // But Layout.jsx and other components expect `{ user: { username: 'xxx' } }`.
  // If we detect the unwrapped version, wrap it once on mount.
  useEffect(() => {
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
      const authToken = localStorage.getItem('authToken');

      if (!rawUser && !authToken) return;
      if (rawUser && authToken) return;

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
        <Suspense fallback={<PageLoader />}>
          <Toaster position="top-right" />
          <Routes>
            {/* Auth Routes - No Layout */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
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
                  <Route path="/employees" element={<EmployeeList />} />
                  <Route path="/employees/new" element={<EmployeeForm />} />
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

                  {/* Reports */}
                  <Route path="/reports/gst" element={<GstReport />} />
                  <Route path="/reports/revenue" element={<RevenueReport />} />
                  <Route path="/reports/profit-loss" element={<ProfitLossStatement />} />
                  <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
                  <Route path="/reports/cash-flow" element={<CashFlowStatement />} />

                  {/* Accounts */}
                  <Route path="/accounts/payments" element={<PaymentCollection />} />
                  <Route path="/accounts/statements" element={<AccountStatement />} />

                  <Route path="/subscription" element={<Subscription />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                </Routes>
              </Layout>
            </PrivateRoute>
            } />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;

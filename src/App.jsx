import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PageLoader from './components/PageLoader';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import api from './api/axios';

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

            {/* Main App Routes - With Layout & Protected */}
            <Route path="/*" element={
              <PrivateRoute>
                <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/invoices" replace />} />

                  {/* Invoices */}
                  <Route path="/invoices" element={<InvoiceList />} />
                  <Route path="/invoices/new" element={<InvoiceForm />} />
                  <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
                  <Route path="/invoices/:id/print" element={<InvoicePrint />} />

                  {/* Quotes */}
                  <Route path="/quotes" element={<QuoteList />} />
                  <Route path="/quotes/new" element={<QuoteForm docType="quote" />} />
                  <Route path="/quotes/edit/:id" element={<QuoteForm docType="quote" />} />
                  <Route path="/quotes/:id/print" element={<QuotePrint docType="quote" />} />

                  {/* Proformas */}
                  <Route path="/proformas" element={<ProformaList />} />
                  <Route path="/proformas/new" element={<QuoteForm docType="proforma" />} />
                  <Route path="/proformas/edit/:id" element={<QuoteForm docType="proforma" />} />
                  <Route path="/proformas/:id/print" element={<QuotePrint docType="proforma" />} />

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
                  <Route path="/purchase-orders/:id/print" element={<PurchaseOrderPrint />} />

                  {/* Expenses */}
                  <Route path="/expenses" element={<ExpenseList />} />
                  <Route path="/expenses/new" element={<ExpenseForm />} />
                  <Route path="/expenses/edit/:id" element={<ExpenseForm />} />

                  {/* Reports */}
                  <Route path="/reports/gst" element={<GstReport />} />
                  <Route path="/reports/revenue" element={<RevenueReport />} />

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

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import InvoicePrint from './pages/InvoicePrint';
import Login from './pages/Login';
import Signup from './pages/Signup';

import Layout from './components/Layout';
import ClientList from './pages/ClientList';
import ClientForm from './pages/ClientForm';
import ItemList from './pages/ItemList';
import ItemForm from './pages/ItemForm';
import Settings from './pages/Settings';

import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
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
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/invoices/new" element={<InvoiceForm />} />
                <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
                <Route path="/invoices/:id/print" element={<InvoicePrint />} />
                
                <Route path="/clients" element={<ClientList />} />
                <Route path="/clients/new" element={<ClientForm />} />
                
                <Route path="/items" element={<ItemList />} />
                <Route path="/items/new" element={<ItemForm />} />
                
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </PrivateRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

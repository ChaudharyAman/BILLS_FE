import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Package, Menu, X, Settings as SettingsIcon } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname.startsWith(path)
      ? 'bg-blue-50 text-blue-600'
      : 'text-gray-600 hover:bg-gray-50';
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex-shrink-0 hidden md:block">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <LayoutDashboard /> MyBill
          </h1>
        </div>
        <nav className="p-4 space-y-2">
          <Link
            to="/invoices"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive(
              '/invoices'
            )}`}
          >
            <FileText size={20} />
            Invoices
          </Link>
          <Link
            to="/clients"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive(
              '/clients'
            )}`}
          >
            <Users size={20} />
            Clients
          </Link>
          <Link
            to="/items"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive(
              '/items'
            )}`}
          >
            <Package size={20} />
            Items
          </Link>
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive(
              '/settings'
            )}`}
          >
            <SettingsIcon size={20} />
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;

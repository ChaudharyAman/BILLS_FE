export const DEFAULT_SIDEBAR_SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/dashboard', iconName: 'FaThLarge', moduleId: 'reports' },
      { id: 'bank_statement', label: 'Bank Statement', path: '/bank-statement', iconName: 'FaUniversity', moduleId: 'bankStatements' }
    ]
  },
  {
    id: 'sales_receivables',
    title: 'Sales & Receivables',
    items: [
      { id: 'clients', label: 'Clients / Customers', path: '/clients', iconName: 'FaUsers', moduleId: 'clients' },
      { id: 'invoices', label: 'Invoices', path: '/invoices', iconName: 'FaFileInvoice', moduleId: 'invoices' },
      {
        id: 'quotes_proformas',
        label: 'Quotes & Proformas',
        iconName: 'FaClipboardList',
        type: 'collapsible',
        children: [
          { id: 'quotes', label: 'Quotes', path: '/quotes', moduleId: 'quotes' },
          { id: 'proformas', label: 'Proformas', path: '/proformas', moduleId: 'proformas' }
        ]
      },
      { id: 'incomes', label: 'Incomes', path: '/incomes', iconName: 'FaPlus', moduleId: 'income' },
      { id: 'recurring', label: 'Recurring', path: '/recurring', iconName: 'FaRedo', moduleId: 'recurringTransactions' }
    ]
  },
  {
    id: 'purchases_payables',
    title: 'Purchases & Payables',
    items: [
      { id: 'vendors', label: 'Vendors / Suppliers', path: '/vendors', iconName: 'FaTruck', moduleId: 'vendors' },
      { id: 'purchase_orders', label: 'Purchase Orders', path: '/purchase-orders', iconName: 'FaShoppingCart', moduleId: 'purchaseOrders' },
      { id: 'expenses', label: 'Expenses', path: '/expenses', iconName: 'FaMinus', moduleId: 'expenses' }
    ]
  },
  {
    id: 'operations_assets',
    title: 'Operations & Assets',
    items: [
      { id: 'inventory', label: 'Inventory', path: '/items', iconName: 'FaBox', moduleId: 'items' },
      { id: 'assets', label: 'Assets', path: '/assets', iconName: 'FaUniversity', moduleId: 'assets' },
      { id: 'projects', label: 'Projects', path: '/projects', iconName: 'FaProjectDiagram', moduleId: 'projects' },
      { id: 'business_units', label: 'Business Units', path: '/business-units', iconName: 'FaBuilding', moduleId: 'businessUnits' }
    ]
  },
  {
    id: 'human_resources',
    title: 'Payroll',
    items: [
      { id: 'payroll_dashboard', label: 'Dashboard', path: '/payroll', iconName: 'FaMoneyBillWave', moduleId: 'payroll' },
      { id: 'employees', label: 'Employees', path: '/employees', iconName: 'FaUsers', moduleId: 'employees' },
      { id: 'payroll_process', label: 'Process Payroll', path: '/payroll/process', iconName: 'FaCalculator', moduleId: 'payroll' },
      { id: 'payroll_calculator', label: 'Salary Calculator', path: '/payroll/calculator', iconName: 'FaCalculator', moduleId: 'payroll' },
      { id: 'payroll_reports', label: 'Reports', path: '/payroll/reports', iconName: 'FaChartBar', moduleId: 'payroll' },
      { id: 'payroll_settings', label: 'Settings', path: '/payroll/settings', iconName: 'FaCog', moduleId: 'payroll' },
      { id: 'payroll_portal', label: 'Employee Portal (ESS)', path: '/payroll/portal', iconName: 'FaUserTie', moduleId: 'payroll' }
    ]
  },
  {
    id: 'financial_control',
    title: 'Financial Control',
    items: [
      { id: 'budgets', label: 'Budgets', path: '/budgets', iconName: 'FaBalanceScale', moduleId: 'budgets' },
      { id: 'categories', label: 'Categories', path: '/categories', iconName: 'FaTags', moduleId: 'categories' },
      { id: 'liabilities', label: 'Liabilities & Debt', path: '/liabilities', iconName: 'FaCreditCard', moduleId: 'liabilities' },
      {
        id: 'accounts_group',
        label: 'Accounts',
        iconName: 'FaWallet',
        type: 'collapsible',
        isPremium: true,
        children: [
          { id: 'accounts_payments', label: 'Payment Collection', path: '/accounts/payments', moduleId: 'income' },
          { id: 'accounts_statements', label: 'Account Statements', path: '/accounts/statements', moduleId: 'reports' }
        ]
      },
      {
        id: 'reports_group',
        label: 'Reports',
        iconName: 'FaChartBar',
        type: 'collapsible',
        isPremium: true,
        children: [
          { id: 'tax_dashboard_reports', label: 'Tax Dashboard', path: '/tax-dashboard', moduleId: 'reports' },
          { id: 'reports_gst', label: 'GST Reports', path: '/reports/gst', moduleId: 'reports' },
          { id: 'reports_tds', label: 'TDS Summary', path: '/reports/tds', moduleId: 'reports' },
          { id: 'reports_revenue', label: 'Revenue Reports', path: '/reports/revenue', moduleId: 'reports' },
          { id: 'reports_profit_loss', label: 'Profit & Loss', path: '/reports/profit-loss', moduleId: 'reports' },
          { id: 'reports_balance_sheet', label: 'Balance Sheet', path: '/reports/balance-sheet', moduleId: 'reports' },
          { id: 'reports_cash_flow', label: 'Cash Flow', path: '/reports/cash-flow', moduleId: 'reports' }
        ]
      }
    ]
  },
  {
    id: 'documents',
    title: 'Documents',
    items: [
      { id: 'company_documents', label: 'Documents', path: '/company-documents', iconName: 'FaFolder', moduleId: 'settings' }
    ]
  },
  {
    id: 'system_settings',
    title: 'System & Settings',
    items: [
      // Public Submission Inbox — shown with a badge in Layout.jsx
      { id: 'submissions_inbox', label: 'Submissions Inbox', path: '/submissions', iconName: 'FaInbox', moduleId: 'publicSubmissions' },
      { id: 'recycle_bin', label: 'Recycle Bin', path: '/recycle-bin', iconName: 'FaTrash', moduleId: 'settings' },
      { id: 'team_settings', label: 'Team & Permissions', path: '/settings/team', iconName: 'FaUsers', moduleId: 'teamMembers' },
      { id: 'upgrade', label: 'Upgrade', path: '/subscription', iconName: 'FaStar', isSpecial: true, moduleId: 'subscription' },
      { id: 'settings', label: 'Settings', path: '/settings', iconName: 'FaCog', moduleId: 'settings' },
      { id: 'admin_panel', label: 'Admin Panel', path: '/admin', iconName: 'FaLock', isSuperAdmin: true, moduleId: null }
    ]
  }
];

const LOCAL_STORAGE_KEY = 'mbf_sidebar_layout_v10';
const LEGACY_STORAGE_KEY = 'mbf_sidebar_layout_v9';

/**
 * Merges a parsed custom layout from localStorage with the absolute default layout,
 * ensuring any new sections or items introduced in codebase updates are not lost.
 */
export function mergeWithDefaults(customLayout) {
  if (!Array.isArray(customLayout)) return DEFAULT_SIDEBAR_SECTIONS;

  // 1. Map of all default items globally for validation and merging
  const defaultItemsMap = {};
  const defaultItemOriginalSection = {}; // itemId -> sectionId

  DEFAULT_SIDEBAR_SECTIONS.forEach(sec => {
    sec.items.forEach(item => {
      defaultItemsMap[item.id] = item;
      defaultItemOriginalSection[item.id] = sec.id;
    });
  });

  const merged = [];
  const placedItemIds = new Set();

  // 2. Process sections in custom order
  customLayout.forEach(customSec => {
    const defaultSec = DEFAULT_SIDEBAR_SECTIONS.find(s => s.id === customSec.id);
    if (defaultSec) {
      const mergedItems = [];
      const customItems = customSec.items || [];

      // Add custom-arranged items if they exist globally in defaults
      customItems.forEach(customItem => {
        const defaultItem = defaultItemsMap[customItem.id];
        if (defaultItem) {
          // If company_documents was previously in system_settings by default,
          // migrate it to its new dedicated 'documents' section
          if (customSec.id === 'system_settings' && customItem.id === 'company_documents') {
            return;
          }
          mergedItems.push({
            ...defaultItem,
            hidden: !!customItem.hidden
          });
          placedItemIds.add(customItem.id);
        }
      });

      merged.push({
        ...defaultSec,
        title: defaultSec.title, // keep latest default title
        hidden: !!customSec.hidden,
        items: mergedItems
      });
    }
  });

  // 3. Add any default sections that were missing entirely in custom layout
  DEFAULT_SIDEBAR_SECTIONS.forEach(defaultSec => {
    if (!merged.some(s => s.id === defaultSec.id)) {
      const mergedSec = {
        ...defaultSec,
        hidden: false,
        items: []
      };
      
      defaultSec.items.forEach(item => {
        if (!placedItemIds.has(item.id)) {
          mergedSec.items.push({
            ...item,
            hidden: false
          });
          placedItemIds.add(item.id);
        }
      });

      merged.push(mergedSec);
    }
  });

  // 4. Place any unplaced default items back to their default section
  Object.keys(defaultItemsMap).forEach(itemId => {
    if (!placedItemIds.has(itemId)) {
      const originalSecId = defaultItemOriginalSection[itemId];
      const mergedSec = merged.find(s => s.id === originalSecId);
      if (mergedSec) {
        mergedSec.items.push({
          ...defaultItemsMap[itemId],
          hidden: false
        });
        placedItemIds.add(itemId);
      }
    }
  });

  return merged;
}

export const getSidebarLayout = () => {
  try {
    let raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        try {
          const parsedLegacy = JSON.parse(legacyRaw);
          const migrated = mergeWithDefaults(parsedLegacy);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(migrated));
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          return JSON.parse(JSON.stringify(migrated));
        } catch {
          // ignore error and proceed
        }
      }
      return JSON.parse(JSON.stringify(DEFAULT_SIDEBAR_SECTIONS));
    }
    const parsed = JSON.parse(raw);
    return JSON.parse(JSON.stringify(mergeWithDefaults(parsed)));
  } catch (e) {
    console.error('Failed to parse sidebar layout', e);
    return JSON.parse(JSON.stringify(DEFAULT_SIDEBAR_SECTIONS));
  }
};

export const saveSidebarLayout = (layout) => {
  try {
    const merged = mergeWithDefaults(layout);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event('sidebar-layout-sync'));
  } catch (e) {
    console.error('Failed to save sidebar layout', e);
  }
};

export const resetSidebarLayout = () => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.dispatchEvent(new Event('sidebar-layout-sync'));
  } catch (e) {
    console.error('Failed to reset sidebar layout', e);
  }
};

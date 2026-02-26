const fs = require('fs');
const path = require('path');

const refactorFile = (filePath, replacements) => {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [search, replace] of replacements) {
    if (search instanceof RegExp) {
      content = content.replace(search, replace);
    } else {
      content = content.split(search).join(replace);
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Refactored ${filePath}`);
};

const listReplacements = [
  [/QuoteList/g, 'PurchaseOrderList'],
  [/quotes/g, 'purchaseOrders'],
  [/quote/gi, 'purchaseOrder'],
  [/Quote/g, 'PurchaseOrder'],
  [/\/api\/purchaseOrders/g, '/api/purchase-orders'],
  [/\/purchaseOrders/g, '/purchase-orders'], // UI routes
  [/client/g, 'vendor'],
  [/Client/g, 'Vendor'],
  [/QT-/g, 'PO-']
];

const formReplacements = [
  [/QuoteForm/g, 'PurchaseOrderForm'],
  [/quotes/g, 'purchaseOrders'],
  [/quote/gi, 'purchaseOrder'],
  [/Quote/g, 'PurchaseOrder'],
  [/\/api\/purchaseOrders/g, '/api/purchase-orders'],
  [/\/purchaseOrders/g, '/purchase-orders'],
  [/client/g, 'vendor'],
  [/Client/g, 'Vendor'],
  [/QT-/g, 'PO-'],
  // Replace ClientSelect with VendorSelect logic (assuming we change the API endpoint)
  [/\/api\/clients/g, '/api/vendors'], 
];

refactorFile(path.join(__dirname, 'src', 'pages', 'PurchaseOrderList.jsx'), listReplacements);
refactorFile(path.join(__dirname, 'src', 'pages', 'PurchaseOrderForm.jsx'), formReplacements);


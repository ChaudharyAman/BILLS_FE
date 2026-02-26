const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'PurchaseOrderList.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  [/\/api\/quotes/g, '/api/purchase-orders'],
  [/\/quotes/g, '/purchase-orders'],
  [/Quotes/g, 'Purchase Orders'],
  [/quotes/g, 'purchaseOrders'],
  [/QuoteList/g, 'PurchaseOrderList'],
  [/Quote/g, 'PurchaseOrder'],
  [/quote/g, 'purchaseOrder'],
  [/client/g, 'vendor'],
  [/Client/g, 'Vendor'],
  [/QT-/g, 'PO-']
];

for (const [search, replace] of replacements) {
  content = content.replace(search, replace);
}

// Special case: we mapped purchaseOrderNo but maybe we need poNumber
content = content.replace(/purchaseOrderNo/g, 'poNumber');

// One more fix: "Purchase Orderss" might happen if we already had Quotes -> Purchase Orders, then quotes -> purchaseOrders. 
// "Quotes" -> "Purchase Orders", "quotes" -> "purchaseOrders".
// "Purchase Orders" -> "Purchase Orders", so it's fine.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Refactored PurchaseOrderList.jsx');

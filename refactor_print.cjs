const fs = require('fs');
let content = fs.readFileSync('src/pages/QuotePrint.jsx', 'utf8');

content = content.replace(/QuotePrint/g, 'PurchaseOrderPrint');
content = content.replace(/const PurchaseOrderPrint = \(\{ docType = 'quote' \}\) => \{/, 'const PurchaseOrderPrint = () => {');
content = content.replace(/const isProforma = docType === 'proforma';/, '');
content = content.replace(/const apiBase = isProforma \? '\/proformas' : '\/quotes';/, "const apiBase = '/purchase-orders';");
content = content.replace(/const listPath = isProforma \? '\/proformas' : '\/quotes';/, "const listPath = '/purchase-orders';");
content = content.replace(/const docLabel = isProforma \? 'PROFORMA INVOICE' : 'QUOTATION';/, "const docLabel = 'PURCHASE ORDER';");
content = content.replace(/const docColor = isProforma \? '#1e5f3a' : '#1e3a5f';/, "const docColor = '#1e3a5f';");
content = content.replace(/\[doc, isProforma\]/g, '[doc]');
content = content.replace(/isProforma \? doc\.proformaNo : doc\.quoteNo/g, 'doc.poNumber');
content = content.replace(/isProforma \? 'Proforma' : 'Quote'/g, "'Purchase Order'");
content = content.replace(/isProforma \? 'This is not a tax invoice.' : 'Subject to acceptance.'/g, "'Subject to acceptance.'");
content = content.replace(/isProforma \? 'PROFORMA INVOICE' \: 'PURCHASEORDER'/g, "'PURCHASE ORDER'");
content = content.replace(/export default QuotePrint;/, 'export default PurchaseOrderPrint;');

fs.writeFileSync('src/pages/PurchaseOrderPrint.jsx', content);

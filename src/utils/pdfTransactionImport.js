const normalizeName = (value = '') =>
  String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const findByName = (list = [], name = '') => {
  const target = normalizeName(name);
  if (!target) return null;
  return list.find(item => normalizeName(item.name) === target) || null;
};

export const buildPdfTransactionPatch = (pdf, kind, { vendors = [], clients = [], inventory = [] } = {}) => {
  const isIncome = kind === 'income';
  const vendorName = isIncome
    ? (pdf.clientName || pdf.vendorName || '')
    : (pdf.vendorName || pdf.clientName || '');
  const clientName = isIncome
    ? ''
    : (pdf.clientName || '');

  const vendorMatch = findByName(vendors, vendorName);
  const clientMatch = findByName(clients, clientName);

  const items = Array.isArray(pdf.items)
    ? pdf.items
        .filter(item => item?.name)
        .map(item => {
          const itemMatch = findByName(inventory, item.name);
          const qty = Number(item.qty) || 1;
          const rate = Number(item.rate) || 0;
          return {
            itemRef: itemMatch?._id || '',
            name: item.name || '',
            description: item.description || '',
            unit: item.unit || 'pcs',
            qty,
            rate,
            taxRate: Number(item.taxRate) || 0,
            amount: qty * rate,
          };
        })
    : [];

  const notes = [];
  if (vendorName && !vendorMatch) {
    notes.push(`PDF scanned party: ${vendorName}`);
  }
  if (clientName && !clientMatch && normalizeName(clientName) !== normalizeName(vendorName)) {
    notes.push(`PDF scanned reference client: ${clientName}`);
  }

  return {
    numberSuffix: pdf.documentNumber || pdf.invoiceNo || '',
    date: pdf.documentDate || pdf.invoiceDate || '',
    paymentMethod: pdf.paymentMethod || pdf.paymentMode || '',
    vendorRef: vendorMatch?._id || '',
    vendorName,
    clientRef: clientMatch?._id || '',
    clientName,
    items,
    privateNotes: notes.join('\n'),
  };
};

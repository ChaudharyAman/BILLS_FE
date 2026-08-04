const MONTHS = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const getRowValue = (row, keys) => {
  for (const key of keys) {
    if (hasValue(row?.[key])) {
      return row[key];
    }
  }
  return undefined;
};

const toText = (value) => (hasValue(value) ? String(value).trim() : '');

const parseNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (!hasValue(value)) {
    return 0;
  }

  const normalized = String(value)
    .replace(/[, ]+/g, '')
    .replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateForApi = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value) => {
  if (!hasValue(value)) {
    return undefined;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateForApi(value);
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateForApi(parsed);
    }
  }

  const text = String(value).trim();
  if (!text) {
    return undefined;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return text;
  }

  const dmyWithMonthMatch = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dmyWithMonthMatch) {
    const [, day, monthText, year] = dmyWithMonthMatch;
    const monthIndex = MONTHS[monthText.toLowerCase()];
    if (monthIndex !== undefined) {
      return formatDateForApi(new Date(Number(year), monthIndex, Number(day)));
    }
  }

  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const [, first, second, yearText] = slashMatch;
    const year = yearText.length === 2 ? Number(`20${yearText}`) : Number(yearText);
    const day = Number(first);
    const month = Number(second);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return formatDateForApi(new Date(year, month - 1, day));
    }
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateForApi(parsed);
  }

  return undefined;
};

const normalizeInvoiceType = (value) => {
  const text = toText(value).toLowerCase();
  if (text === 'invoice') return 'Invoice';
  if (text === 'retail invoice') return 'Retail Invoice';
  if (text === 'excise invoice') return 'Excise Invoice';
  return 'Tax Invoice';
};

const normalizeStatus = (value, balanceDue = 0) => {
  const text = toText(value).toUpperCase();

  if (['PAID', 'PAYMENT RECEIVED', 'RECEIVED'].includes(text)) return 'RECEIVED';
  if (['PARTIAL', 'PARTIALLY PAID'].includes(text)) return 'PARTIAL';
  if (['SENT'].includes(text)) return 'SENT';
  if (['DRAFT'].includes(text)) return 'DRAFT';
  if (['CANCELLED', 'CANCELED', 'VOID'].includes(text)) return 'CANCELLED';
  if (['OVERDUE', 'UNPAID', 'PENDING'].includes(text)) return 'UNPAID';

  return balanceDue > 0 ? 'UNPAID' : 'RECEIVED';
};

const normalizeDrCr = (value) => (toText(value).toLowerCase().startsWith('cr') ? 'Cr.' : 'Dr.');

const isSummaryClientName = (value) => /^total\s+invoices?$/i.test(toText(value));

const hasItemColumns = (row) => {
  const itemName = toText(getRowValue(row, ['Item Name', 'Item', 'Product Name', 'Product', 'Description']));
  if (itemName) {
    return true;
  }

  return [
    'Qty',
    'QTY',
    'Quantity',
    'Quantity ',
    'Rate',
    'Price',
    'Unit Price',
    'Tax Rate',
    'Tax',
    'Tax %',
  ].some((key) => hasValue(row?.[key]));
};

const buildCombinedNotes = (privateNotes, paymentsText) => {
  const notes = [];
  if (toText(privateNotes)) {
    notes.push(toText(privateNotes));
  }
  if (toText(paymentsText)) {
    notes.push(`Imported payments: ${toText(paymentsText)}`);
  }
  return notes.join('\n\n');
};

const roundTwo = (value) => Math.round((Number(value) || 0) * 100) / 100;

const buildFallbackItem = (invoice) => {
  const subtotal = Number(invoice.importedSubTotal) || 0;
  const taxTotal = Number(invoice.importedTaxTotal) || 0;
  const grandTotal = Number(invoice.importedGrandTotal) || 0;
  const discountTotal = Number(invoice.discountTotal) || 0;
  const shippingCharges = Number(invoice.shippingCharges) || 0;
  const packagingCharges = Number(invoice.packagingCharges) || 0;
  const tcs = Number(invoice.tcs) || 0;

  const fallbackRate = subtotal > 0
    ? subtotal
    : Math.max(0, grandTotal - taxTotal + discountTotal - shippingCharges - packagingCharges - tcs);
  const fallbackTaxRate = subtotal > 0 && taxTotal > 0
    ? roundTwo((taxTotal / subtotal) * 100)
    : 0;

  return {
    name: `Imported invoice ${invoice.invoiceNo || invoice.clientName}`.trim(),
    description: 'Imported from spreadsheet summary row',
    qty: 1,
    unit: 'pcs',
    rate: roundTwo(fallbackRate),
    taxRate: fallbackTaxRate,
    discount: 0,
  };
};

export const mapInvoiceImportRows = (rows = []) => {
  const grouped = {};

  rows.forEach((row, index) => {
    const clientName = toText(getRowValue(row, ['Client Name', 'Client', 'Customer Name', 'Customer']));
    if (isSummaryClientName(clientName)) {
      return;
    }

    const invoiceNo = toText(getRowValue(row, ['Invoice Number', 'Invoice Num', 'Invoice No', 'Draft No', 'ID', 'Id', 'id']));
    const groupKey = invoiceNo || `${clientName || 'invoice'}-${index}`;

    if (!grouped[groupKey]) {
      const importedSubTotal = roundTwo(parseNumber(getRowValue(row, ['Amount', 'Sub Total', 'Subtotal', 'Taxable Amount'])));
      const importedTaxTotal = roundTwo(parseNumber(getRowValue(row, ['Tax', 'Tax Total', 'Total Tax'])));
      const importedGrandTotal = roundTwo(parseNumber(getRowValue(row, ['Total', 'Grand Total'])));
      const advancePaid = roundTwo(parseNumber(getRowValue(row, ['Amount Paid', 'Amount Pai', 'Advance Paid', 'Paid Amount', 'Advance'])));
      const balanceDue = roundTwo(parseNumber(getRowValue(row, ['Balance', 'Balance Due', 'Outstanding'])));

      grouped[groupKey] = {
        invoiceNo,
        clientName,
        clientGST: toText(getRowValue(row, ['Client GSTIN', 'GSTIN', 'Client GST'])),
        clientEmail: toText(getRowValue(row, ['Client Email', 'Email', 'Customer Email'])),
        clientPhone: toText(getRowValue(row, ['Client Phone Number', 'Client Phone', 'Client Phon', 'Phone', 'Customer Phone', 'Contact'])),
        clientCity: toText(getRowValue(row, ['Client City', 'City'])),
        clientState: toText(getRowValue(row, ['Client State', 'State'])),
        placeOfSupply: toText(getRowValue(row, ['Place of Supply', 'Client State', 'State'])),
        invoiceType: normalizeInvoiceType(getRowValue(row, ['Type', 'Invoice Type', 'Document Type'])),
        date: parseDateValue(getRowValue(row, ['Issue Date', 'Date', 'Invoice Date'])),
        dueDate: parseDateValue(getRowValue(row, ['Due Date'])),
        paymentDate: parseDateValue(getRowValue(row, ['Date Of Payment', 'Date Of Pay', 'Payment Date'])),
        paymentMode: toText(getRowValue(row, ['Payment Mode', 'Payment Me', 'Payment Method'])),
        paymentTerms: toText(getRowValue(row, ['Payment Terms'])),
        shippingCharges: roundTwo(parseNumber(getRowValue(row, ['Shipping Charges', 'Shipping', 'Freight']))),
        packagingCharges: roundTwo(parseNumber(getRowValue(row, ['Packaging Charges', 'Packaging']))),
        discountTotal: roundTwo(parseNumber(getRowValue(row, ['Discount Total', 'Discount']))),
        advancePaid,
        balanceDue,
        importedSubTotal,
        importedTaxTotal,
        importedGrandTotal,
        importedBalanceDue: balanceDue,
        tds: roundTwo(parseNumber(getRowValue(row, ['TDS']))),
        tcs: roundTwo(parseNumber(getRowValue(row, ['TCS']))),
        currency: toText(getRowValue(row, ['Currency'])) || 'INR',
        fy: toText(getRowValue(row, ['Financial Year', 'Financial Y', 'FY'])),
        drCr: normalizeDrCr(getRowValue(row, ['Dr. / Cr.', 'Dr/Cr'])),
        status: normalizeStatus(getRowValue(row, ['Status']), balanceDue),
        notes: buildCombinedNotes(
          getRowValue(row, ['Private notes', 'Private Notes', 'Private note', 'Notes']),
          getRowValue(row, ['Payments'])
        ),
        transport: {
          poNumber: toText(getRowValue(row, ['P.O. Number', 'P.O. Numbe', 'PO Number', 'Transport PO Number'])),
          poDate: parseDateValue(getRowValue(row, ['P.O. Date', 'PO Date', 'Transport PO Date'])),
        },
        importMode: hasItemColumns(row) ? 'itemized' : 'summary',
        items: [],
      };
    }

    const target = grouped[groupKey];
    const itemName = toText(getRowValue(row, ['Item Name', 'Item', 'Product Name', 'Product', 'Description']));
    if (itemName) {
      target.items.push({
        name: itemName,
        description: toText(getRowValue(row, ['Item Description', 'Desc', 'Details'])),
        hsnCode: toText(getRowValue(row, ['HSN/SAC', 'HSN Code', 'HSN'])),
        unit: toText(getRowValue(row, ['Unit'])) || 'pcs',
        qty: parseNumber(getRowValue(row, ['Qty', 'QTY', 'Quantity', 'Quantity '])) || 1,
        rate: roundTwo(parseNumber(getRowValue(row, ['Rate', 'Price', 'Unit Price']))),
        taxRate: roundTwo(parseNumber(getRowValue(row, ['Tax Rate', 'Tax', 'Tax %', 'GST', 'IGST']))),
        discount: roundTwo(parseNumber(getRowValue(row, ['Item Discount', 'Disc']))),
      });
      target.importMode = 'itemized';
    }
  });

  return Object.values(grouped)
    .filter((invoice) => invoice.clientName && !isSummaryClientName(invoice.clientName))
    .map((invoice) => ({
      ...invoice,
      items: invoice.items.length > 0 ? invoice.items : [buildFallbackItem(invoice)],
    }));
};

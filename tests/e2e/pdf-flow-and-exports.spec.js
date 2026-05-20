import { test, expect } from '@playwright/test';
import { login, readSeededUsers, uniqueName, waitForApiMutation } from './support/helpers.js';

test('pro user can save a PDF-imported invoice, verify print page, and export client data', async ({ page }) => {
  const seeded = readSeededUsers();
  const importedClient = uniqueName('PDF Client');
  const importedItem = uniqueName('PDF Item');
  const invoiceNumber = uniqueName('PDFINV');

  await login(page, seeded.pro.username, seeded.password);

  const pdfPayload = {
    invoiceNo: invoiceNumber,
    invoiceDate: '2026-04-13',
    dueDate: '2026-04-20',
    clientName: importedClient,
    clientGST: '07ABCDE1234F1Z5',
    placeOfSupply: 'Delhi',
    paymentMode: 'UPI',
    poNumber: 'PO-PDF-1',
    poDate: '2026-04-12',
    items: [
      {
        name: importedItem,
        description: '',
        unit: 'pcs',
        qty: 2,
        rate: 155,
        taxRate: 18,
        discount: 0,
      },
    ],
    subTotal: 310,
    taxTotal: 55.8,
    grandTotal: 365.8,
    customChargeLabel: '',
    packagingCharges: 0,
    _fromPdfImport: true,
  };

  await page.goto('/invoices');
  await page.evaluate((payload) => {
    window.sessionStorage.setItem('pdfImportData', JSON.stringify(payload));
  }, pdfPayload);

  await page.goto('/invoices/new?source=pdf');
  await expect(page.getByTestId('invoice-number')).toHaveValue(invoiceNumber);
  await expect(page.getByTestId('invoice-place-of-supply')).toHaveValue('Delhi');
  await expect(page.getByTestId('invoice-payment-mode')).toHaveValue('UPI');
  await expect(page.getByTestId('invoice-item-select-0')).toContainText(importedItem);
  await expect(page.getByTestId('invoice-item-qty-0')).toHaveValue('2');
  await expect(page.getByTestId('invoice-item-rate-0')).toHaveValue('155');

  const invoiceSave = waitForApiMutation(page, 'POST', '/invoices');
  await page.getByTestId('save-invoice').click();
  const invoiceResponse = await invoiceSave;
  const invoiceData = await invoiceResponse.json();
  const createdInvoiceId = invoiceData?._id || invoiceData?.invoice?._id;

  await expect(page).toHaveURL(/\/invoices$/);
  await page.getByPlaceholder('Search invoices...').fill(invoiceNumber);
  await expect(page.getByText(invoiceNumber).first()).toBeVisible();

  if (createdInvoiceId) {
    await page.goto(`/invoices/${createdInvoiceId}/print`);
    await expect(page.getByText('Print / Download')).toBeVisible();
    await expect(page.getByText(invoiceNumber).first()).toBeVisible();
  }

  await page.goto('/clients');
  await page.getByPlaceholder('Search').fill(importedClient);
  await expect(page.getByText(importedClient).first()).toBeVisible();

  const clientExportDownload = page.waitForEvent('download');
  await page.getByTestId('clients-export').click();
  await page.getByTestId('clients-export-csv').click();
  const download = await clientExportDownload;
  expect(download.suggestedFilename()).toContain('Clients_Export');

  await page.goto('/items');
  await page.getByPlaceholder('Search inventory...').fill(importedItem);
  await expect(page.getByText(importedItem).first()).toBeVisible();
});

import { test, expect } from '@playwright/test';
import { login, readSeededUsers, uniqueName } from './support/helpers.js';

test('pro user can create client, item, invoice, and open major app pages', async ({ page }) => {
  const seeded = readSeededUsers();
  const clientName = uniqueName('E2E Client');
  const itemName = uniqueName('E2E Item');
  const invoiceNumber = uniqueName('INV');

  await login(page, seeded.pro.username, seeded.password);

  await page.goto('/clients/new');
  await page.getByTestId('client-name').fill(clientName);
  await page.getByTestId('client-email').fill(`${clientName.replace(/\s+/g, '').toLowerCase()}@example.com`);
  await page.getByTestId('client-billing-state').fill('Delhi');
  await page.getByTestId('save-client').click();
  await expect(page).toHaveURL(/\/clients$/);
  await expect(page.getByText(clientName).first()).toBeVisible();

  await page.goto('/items/new');
  await page.getByTestId('item-name').fill(itemName);
  await page.getByTestId('item-sales-price').fill('125');
  await page.getByTestId('save-item').click();
  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByText(itemName).first()).toBeVisible();

  await page.goto('/invoices/new?type=Tax+Invoice');
  await page.getByTestId('invoice-client-select').selectOption({ label: clientName });
  await page.getByTestId('invoice-place-of-supply').fill('Delhi');
  await page.getByTestId('invoice-number').fill(invoiceNumber);
  await page.getByTestId('invoice-due-date').fill('2026-04-20');
  await page.getByTestId('invoice-payment-mode').selectOption('UPI');
  await page.getByTestId('invoice-item-select-0').click();
  await page.getByTestId('invoice-item-select-0-search').fill(itemName);
  await page.getByText(itemName).click();
  await page.getByTestId('invoice-item-description-0').fill('Created by browser automation');
  await page.getByTestId('invoice-item-qty-0').fill('2');
  await page.getByTestId('invoice-item-rate-0').fill('125');
  await page.getByTestId('save-invoice').click();

  await expect(page).toHaveURL(/\/invoices$/);
  await page.getByPlaceholder('Search invoices...').fill(invoiceNumber);
  await expect(page.getByText(invoiceNumber).first()).toBeVisible();

  await page.goto('/quotes/new');
  await expect(page.getByText('Add New Quotation')).toBeVisible();
  await expect(page.getByRole('button', { name: /Preview.*save/i })).toBeVisible();

  await page.goto('/proformas/new');
  await expect(page.getByText('Add New Proforma Invoice')).toBeVisible();

  await page.goto('/purchase-orders/new');
  await expect(page.getByText('Add New Purchase Order')).toBeVisible();

  await page.goto('/expenses/new');
  await expect(page.getByText('Add New Expense')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Save$/i })).toBeVisible();

  await page.goto('/reports/gst');
  await expect(page.getByRole('heading', { name: 'GST Report' })).toBeVisible();

  await page.goto('/reports/revenue');
  await expect(page.getByText('Client Revenue Report')).toBeVisible();

  await page.goto('/accounts/payments');
  await expect(page.getByRole('heading', { name: 'Payment Collection' })).toBeVisible();

  await page.goto('/accounts/statements');
  await expect(page.getByRole('heading', { name: 'Account Statement' })).toBeVisible();

  await page.goto('/subscription');
  await expect(page.getByText('Simple, transparent pricing')).toBeVisible();

  await page.goto('/settings');
  await expect(page.getByText('Company Settings')).toBeVisible();
});

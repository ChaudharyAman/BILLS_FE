import { test, expect } from '@playwright/test';
import { login, readSeededUsers, selectItemFromPicker, uniqueName, waitForApiMutation } from './support/helpers.js';

test('pro user can create vendor, purchase order, and expense', async ({ page }) => {
  const seeded = readSeededUsers();
  const vendorName = uniqueName('E2E Vendor');
  const itemName = uniqueName('E2E Ops Item');
  const purchaseOrderNumber = `${Date.now()}`.slice(-6);
  const expenseNumber = `${Date.now()}`.slice(-5);

  await login(page, seeded.pro.username, seeded.password);

  await page.goto('/vendors/new');
  const vendorSave = waitForApiMutation(page, 'POST', '/clients');
  await page.getByTestId('vendor-name').fill(vendorName);
  await page.getByTestId('vendor-email').fill(`${vendorName.replace(/\s+/g, '').toLowerCase()}@example.com`);
  await page.getByTestId('vendor-billing-state').fill('Delhi');
  await page.getByTestId('save-vendor').click();
  await vendorSave;
  await expect(page).toHaveURL(/\/vendors$/);
  await expect(page.getByText(vendorName).first()).toBeVisible();

  await page.goto('/items/new');
  const itemSave = waitForApiMutation(page, 'POST', '/items');
  await page.getByTestId('item-name').fill(itemName);
  await page.getByTestId('item-sales-price').fill('180');
  await page.getByTestId('save-item').click();
  await itemSave;
  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByText(itemName).first()).toBeVisible();

  await page.goto('/purchase-orders/new');
  await page.getByTestId('purchase-order-vendor-select').selectOption({ label: vendorName });
  await page.getByTestId('purchase-order-doc-number').fill(purchaseOrderNumber);
  await page.getByTestId('purchase-order-valid-until').fill('2026-04-30');
  await selectItemFromPicker(page, 'purchase-order-item-select-0', itemName);
  await page.getByTestId('purchase-order-item-description-0').fill('Purchase order line created by automation');
  await page.getByTestId('purchase-order-item-qty-0').fill('3');
  await page.getByTestId('purchase-order-item-rate-0').fill('180');
  const purchaseOrderSave = waitForApiMutation(page, 'POST', '/purchase-orders');
  await page.getByTestId('purchase-order-save-draft').click();
  await purchaseOrderSave;
  await expect(page).toHaveURL(/\/purchase-orders$/);

  await page.goto('/expenses/new');
  await page.getByTestId('expense-vendor-select').selectOption({ label: vendorName });
  await page.getByTestId('expense-number-suffix').fill(expenseNumber);
  await page.getByTestId('expense-payment-method').selectOption('UPI');
  await page.getByTestId('expense-item-select-0').selectOption({ label: itemName });
  await page.getByTestId('expense-item-name-0').fill(`${itemName} expense`);
  await page.getByTestId('expense-item-qty-0').fill('1');
  await page.getByTestId('expense-item-rate-0').fill('180');
  const expenseSave = waitForApiMutation(page, 'POST', '/expenses');
  await page.getByTestId('save-expense').click();
  await expenseSave;
  await expect(page).toHaveURL(/\/expenses$/);
});

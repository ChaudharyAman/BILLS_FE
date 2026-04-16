import { test, expect } from '@playwright/test';
import { acceptNextDialog, login, readSeededUsers, selectItemFromPicker, uniqueName, waitForApiMutation } from './support/helpers.js';

test('pro user can create quote, proforma, and save settings', async ({ page }) => {
  const seeded = readSeededUsers();
  const clientName = uniqueName('E2E Quote Client');
  const itemName = uniqueName('E2E Quote Item');
  const quoteNumber = `${Date.now()}`.slice(-6);
  const proformaNumber = `${Date.now() + 1}`.slice(-6);
  const contactName = uniqueName('Automation Contact');

  await login(page, seeded.pro.username, seeded.password);

  await page.goto('/clients/new');
  const clientSave = waitForApiMutation(page, 'POST', '/clients');
  await page.getByTestId('client-name').fill(clientName);
  await page.getByTestId('client-email').fill(`${clientName.replace(/\s+/g, '').toLowerCase()}@example.com`);
  await page.getByTestId('client-billing-state').fill('Delhi');
  await page.getByTestId('save-client').click();
  await clientSave;
  await expect(page).toHaveURL(/\/clients$/);
  await expect(page.getByText(clientName).first()).toBeVisible();

  await page.goto('/items/new');
  const itemSave = waitForApiMutation(page, 'POST', '/items');
  await page.getByTestId('item-name').fill(itemName);
  await page.getByTestId('item-sales-price').fill('210');
  await page.getByTestId('save-item').click();
  await itemSave;
  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByText(itemName).first()).toBeVisible();

  await page.goto('/quotes/new');
  await page.getByTestId('quote-client-select').selectOption({ label: clientName });
  await page.getByTestId('quote-doc-number').fill(quoteNumber);
  await page.getByTestId('quote-valid-until').fill('2026-05-10');
  await selectItemFromPicker(page, 'quote-item-select-0', itemName);
  await page.getByTestId('quote-item-description-0').fill('Quote line created by automation');
  await page.getByTestId('quote-item-qty-0').fill('2');
  await page.getByTestId('quote-item-rate-0').fill('210');
  const quoteSave = waitForApiMutation(page, 'POST', '/quotes');
  await page.getByTestId('quote-save-draft').click();
  await quoteSave;
  await expect(page).toHaveURL(/\/quotes$/);

  await page.goto('/proformas/new');
  await page.getByTestId('quote-client-select').selectOption({ label: clientName });
  await page.getByTestId('quote-doc-number').fill(proformaNumber);
  await page.getByTestId('quote-valid-until').fill('2026-05-15');
  await selectItemFromPicker(page, 'quote-item-select-0', itemName);
  await page.getByTestId('quote-item-description-0').fill('Proforma line created by automation');
  await page.getByTestId('quote-item-qty-0').fill('1');
  await page.getByTestId('quote-item-rate-0').fill('210');
  const proformaSave = waitForApiMutation(page, 'POST', '/proformas');
  await page.getByTestId('quote-save-draft').click();
  await proformaSave;
  await expect(page).toHaveURL(/\/proformas$/);

  await page.goto('/settings');
  await page.getByTestId('settings-contact-name').fill(contactName);
  const companySettingsSave = waitForApiMutation(page, 'PUT', '/settings');
  const companyDialog = acceptNextDialog(page);
  await page.getByTestId('save-company-settings').click();
  await companySettingsSave;
  await companyDialog;
  await expect(page.getByTestId('settings-contact-name')).toHaveValue(contactName);

  await page.getByTestId('settings-software-tab').click();
  await expect(page.getByText('Software Settings')).toBeVisible();
  const accountSettingsSave = waitForApiMutation(page, 'PUT', '/auth/profile');
  const accountDialog = acceptNextDialog(page);
  await page.getByTestId('save-account-settings').click();
  await accountSettingsSave;
  await accountDialog;
  await expect(page.getByTestId('settings-username')).toBeVisible();
});

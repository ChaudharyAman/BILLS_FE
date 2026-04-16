import { test, expect } from '@playwright/test';
import { login, logout, readSeededUsers, uniqueName } from './support/helpers.js';

test('signup logs the user in and logout returns to login', async ({ page }) => {
  const seeded = readSeededUsers();
  const username = uniqueName(`${seeded.runId}-signup`);

  await page.goto('/signup');
  await page.getByTestId('signup-username').fill(username);
  await page.getByTestId('signup-email').fill(`${username}@example.com`);
  await page.getByTestId('signup-password').fill(seeded.password);
  await page.getByTestId('signup-confirm-password').fill(seeded.password);
  await page.getByTestId('signup-submit').click();

  await expect(page).toHaveURL(/\/invoices/);
  await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();

  await logout(page);
});

test('free user sees premium modal on protected navigation', async ({ page }) => {
  const seeded = readSeededUsers();

  await login(page, seeded.free.username, seeded.password);

  await page.getByRole('button', { name: /Reports/i }).click();
  await expect(page.getByText('Pro Feature Locked')).toBeVisible();
  await page.getByRole('button', { name: /Maybe Later/i }).click();

  await page.getByRole('button', { name: /Accounts/i }).click();
  await expect(page.getByText('Pro Feature Locked')).toBeVisible();
});

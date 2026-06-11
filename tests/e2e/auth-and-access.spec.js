import { test, expect } from '@playwright/test';
import { login, logout, readSeededUsers, uniqueName } from './support/helpers.js';

test('self-registration is disabled and displays message', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByTestId('registration-disabled-title')).toHaveText('Registration Disabled');
  await expect(page.getByText('Public self-registration is currently disabled.')).toBeVisible();
  
  // Verify back to login works
  await page.getByRole('link', { name: 'Back to Sign In' }).click();
  await expect(page).toHaveURL(/\/login/);
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

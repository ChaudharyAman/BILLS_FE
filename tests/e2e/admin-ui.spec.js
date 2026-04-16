import { test, expect } from '@playwright/test';
import { login, readSeededUsers } from './support/helpers.js';

test('superadmin can open the admin dashboard and manage a user', async ({ page }) => {
  const seeded = readSeededUsers();

  await login(page, seeded.admin.username, seeded.password);
  await page.goto('/admin');

  await expect(page.getByText('Super Admin Dashboard')).toBeVisible();

  const proRow = page.locator('tr', { hasText: seeded.pro.username });
  await expect(proRow).toBeVisible();
  await proRow.getByRole('button', { name: 'Manage' }).click();

  await expect(page.getByText(`Manage User: ${seeded.pro.username}`)).toBeVisible();
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Subscription updated successfully')).toBeVisible();
});

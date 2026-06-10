import { test, expect } from '@playwright/test';
import { login, logout, readSeededUsers, uniqueName } from './support/helpers.js';

test('superadmin can open the admin dashboard and manage a user', async ({ page }) => {
  const seeded = readSeededUsers();

  await login(page, seeded.admin.username, seeded.password);
  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Super Admin Dashboard' })).toBeVisible();

  const proRow = page.locator('tr', { hasText: seeded.pro.username });
  await expect(proRow).toBeVisible();
  await proRow.getByRole('button', { name: 'Manage' }).click();

  await expect(page.getByText(`Manage User: ${seeded.pro.username}`)).toBeVisible();
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Subscription updated successfully')).toBeVisible();
});

test('superadmin can create, login, deactivate, and delete user', async ({ page }) => {
  const seeded = readSeededUsers();
  const testUsername = uniqueName(`${seeded.runId}-adminops`);
  const testEmail = `${testUsername}@example.com`;

  // 1. Create user
  await login(page, seeded.admin.username, seeded.password);
  await page.goto('/admin');
  
  await page.getByTestId('btn-create-user').click();
  await page.getByTestId('create-user-username').fill(testUsername);
  await page.getByTestId('create-user-email').fill(testEmail);
  await page.getByTestId('create-user-password').fill(seeded.password);
  await page.getByTestId('create-user-plan').selectOption('pro');
  await page.getByTestId('btn-create-submit').click();

  await expect(page.getByText('User created successfully')).toBeVisible();
  
  // Wait for user to appear in table
  const userRow = page.locator('tr', { hasText: testUsername });
  await expect(userRow).toBeVisible();
  
  // Log out admin
  await logout(page);

  // 2. Login as the newly created user
  await login(page, testUsername, seeded.password);
  await logout(page);

  // 3. Deactivate user as Admin
  await login(page, seeded.admin.username, seeded.password);
  await page.goto('/admin');
  await page.locator('tr', { hasText: testUsername }).getByRole('button', { name: 'Manage' }).click();
  await page.getByTestId('edit-user-active').selectOption('false');
  await page.getByTestId('btn-save-changes').click();
  await expect(page.getByText('Subscription updated successfully')).toBeVisible();
  
  await logout(page);

  // Try to login as deactivated user (should fail)
  await page.goto('/login');
  await page.getByTestId('login-username').fill(testUsername);
  await page.getByTestId('login-password').fill(seeded.password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByText('Your account has been deactivated')).toBeVisible();

  // 4. Delete user as Admin
  await login(page, seeded.admin.username, seeded.password);
  await page.goto('/admin');
  await page.locator('tr', { hasText: testUsername }).getByRole('button', { name: 'Manage' }).click();
  
  // Accept confirm dialog automatically
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('delete user');
    await dialog.accept();
  });
  
  await page.getByTestId('btn-delete-user').click();
  await expect(page.getByText('User and all associated data deleted successfully')).toBeVisible();
  
  // Verify user is gone
  await expect(page.locator('tr', { hasText: testUsername })).not.toBeVisible();
});

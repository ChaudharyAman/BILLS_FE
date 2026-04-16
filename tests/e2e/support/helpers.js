import fs from 'fs';
import path from 'path';
import { expect } from '@playwright/test';

const USERS_PATH = path.resolve(process.cwd(), 'tests', '.tmp', 'e2e-users.json');

export function readSeededUsers() {
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
}

export async function login(page, username, password) {
  await page.goto('/login');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/invoices/);
}

export async function logout(page) {
  await page.getByTestId('logout-button').click();
  await expect(page).toHaveURL(/\/login/);
}

export async function acceptNextDialog(page) {
  const dialogPromise = page.waitForEvent('dialog');
  return dialogPromise.then(async (dialog) => {
    await dialog.accept();
  });
}

export async function waitForApiMutation(page, method, pathFragment) {
  return page.waitForResponse((response) =>
    response.request().method() === method &&
    response.url().includes(pathFragment) &&
    response.ok()
  );
}

export async function selectItemFromPicker(page, testId, itemName) {
  await page.getByTestId(testId).click();
  await page.getByTestId(`${testId}-search`).fill(itemName);
  await page.getByText(itemName, { exact: true }).first().click();
}

export function uniqueName(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

import { test, expect } from '@playwright/test';

test('settings update and clean-mode font restriction apply', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await page.locator('#font-size-slider').fill('30');
  await expect(page.locator('#fs-val')).toContainText('30');
  await page.selectOption('#font-select', 'Pacifico');
  await page.click('.paper-btn[data-style="clean"]');
  await expect(page.locator('#font-select')).toHaveValue('Kalam'); // auto font restriction
  // The native checkbox input is display:none (custom-checkbox pattern) — click the label
  await page.click('text=Enable rare imperfections');
  await expect(page.locator('#rare-imperfections-toggle')).toBeChecked();
  await page.fill('#text-input', 'Settings test note.');
  await page.click('.btn-render');
  await expect(page.locator('.canvas-page').first()).toBeVisible();
  expect(errors).toEqual([]);
});

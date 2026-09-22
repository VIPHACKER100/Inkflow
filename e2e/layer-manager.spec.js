import { test, expect } from '@playwright/test';
import path from 'path';

test('layer manager expands, adds presets, reorders, and duplicates layers', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await expect(page.locator('#sidebar')).toBeVisible();

  // Expand the Layers section if collapsed
  const layersSection = page.locator('#sec-layers');
  const layersHeader = layersSection.locator('.sb-section-header');
  const isCollapsed = await layersSection.evaluate((el) => el.classList.contains('collapsed'));
  if (isCollapsed) {
    await layersHeader.click();
  }
  await expect(layersSection).not.toHaveClass(/collapsed/);

  // Check initial layer items
  await expect(page.locator('#layer-page-label')).toContainText('Page 1');
  const layerItems = page.locator('#layer-list .layer-item');
  await expect(layerItems).toHaveCount(2); // Background and Content

  // Content layer should be active by default
  const activeLayer = page.locator('#layer-list .layer-item.active');
  await expect(activeLayer).toBeVisible();

  // Test adding Highlighter preset
  await page.evaluate(() => {
    window.addNewLayerPreset('highlighter');
  });

  await expect(layerItems).toHaveCount(3);
  const highlighterLayer = page.locator('#layer-list .layer-item', { hasText: 'Highlighter' });
  await expect(highlighterLayer).toBeVisible();
  await expect(highlighterLayer.locator('.layer-opacity-val')).toContainText('75%');
  await expect(highlighterLayer.locator('.layer-blend')).toHaveValue('multiply');

  // Test duplicating active layer
  await page.locator('.layer-quick-tools button[title*="Duplicate Selected Layer"]').click();
  await expect(layerItems).toHaveCount(4);

  // Test moving active layer down
  await page.locator('.layer-quick-tools button[title*="Move Layer Down"]').click();

  // Hover on Add Layer dropdown button
  await page.locator('.layer-controls-row .dropdown button').hover();
  await page.waitForTimeout(300);

  // Capture screenshot of the sidebar and page
  const artifactPath = path.resolve('C:/Users/vipha/.gemini/antigravity-ide/brain/3d44d0fb-0da2-49d2-9ab8-9f76d25a58fb/layer_manager_verified.png');
  await page.screenshot({ path: artifactPath, fullPage: false });

  // Verify no unhandled JavaScript errors
  expect(errors).toEqual([]);
});

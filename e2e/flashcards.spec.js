import { test, expect } from '@playwright/test';

test('flashcards open, flip, and close', async ({ page }) => {
  await page.goto('/');
  page.on('dialog', (d) => d.dismiss());
  await page.fill('#text-input', 'Q: What is Inkflow?\nA: A handwriting notes generator.');
  await page.click('.btn-render');
  await page.click('button[title="Study Mode: Flashcards & Quiz"]');
  await expect(page.locator('#flashcards-modal')).toBeVisible();
  await expect(page.locator('#flashcard-counter')).toContainText('1 /');
  await page.click('#flashcard-card');
  await expect(page.locator('#flashcard-hint')).toContainText('question');
  await page.click('[aria-label="Close flashcards"]');
  await expect(page.locator('#flashcards-modal')).toBeHidden();
});

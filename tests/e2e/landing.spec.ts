import { expect, test } from '@playwright/test';

const GITHUB_URL = 'https://github.com/Devansh0112/elder-help-mvp';

test('landing page shows the hero and every section', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Help for your parents', { timeout: 30_000 });
  for (const id of ['how', 'who', 'vision', 'roadmap']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.getByText(/simulated/i)).toBeVisible();
});

test('landing page links to GitHub and not to the demo screens', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator(`a[href="${GITHUB_URL}"]`).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('footer')).toBeVisible();
  await expect(page.locator('a[href="/elder"]')).toHaveCount(0);
  await expect(page.locator('a[href="/family"]')).toHaveCount(0);
});

test('landing page images load and have alt text', async ({ page }) => {
  // Reduced motion stops the floating card's bob, which Playwright needs to scroll to it.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('footer')).toBeVisible({ timeout: 30_000 });
  const imgs = page.locator('main img');
  const count = await imgs.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const img = imgs.nth(i);
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveAttribute('alt', /.+/);
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
  }
});

test('landing page fits a phone screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(375);
});

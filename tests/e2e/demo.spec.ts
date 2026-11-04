import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function say(elder: Page, text: string) {
  await elder.getByTestId('text-input').fill(text);
  await elder.getByTestId('text-send').click();
}

test('full demo flow in fake mode', async ({ browser }) => {
  const context = await browser.newContext();
  const elder = await context.newPage();
  const family = await context.newPage();
  await family.goto('/family');
  await expect(family.getByTestId('medicines')).toBeVisible({ timeout: 30_000 }); // first compile can be slow
  await elder.goto('/elder');
  const captions = elder.getByTestId('captions');

  // 1. Booking
  await say(elder, 'I need to see my doctor next week');
  await expect(captions).toContainText('booked');

  // 2. Medicine reminder
  await elder.getByTestId('trigger-reminder').click();
  await expect(elder.getByTestId('reminder-banner')).toContainText('Metformin');
  await say(elder, 'I took it');
  await expect(elder.getByTestId('reminder-banner')).toBeHidden();
  await expect(
    family.getByTestId('medicine-item').filter({ hasText: 'Metformin' }),
  ).toHaveAttribute('data-taken', 'true');

  // 3. Escalation
  await say(elder, 'My sink is leaking');
  await expect(captions).toContainText("I've let your family know.");

  // 4. End of conversation → summary
  await elder.getByTestId('end-button').click();
  await expect(elder.getByTestId('talk-button')).toBeVisible();
  const summary = family.getByTestId('summary-item').filter({ hasText: 'I need to see my doctor' });
  await expect(summary).toBeVisible();
  await expect(summary).not.toContainText('In progress');

  // 5. Dashboard totals
  await expect(family.getByTestId('appointment-item')).toHaveCount(1);
  await expect(family.getByTestId('alert-card')).toHaveCount(1);
  await expect(family.getByTestId('alert-card').first()).toContainText('My sink is leaking');

  await context.close();
});

test('dashboard falls back to polling when the event stream is down', async ({ page, request }) => {
  await page.route('**/api/events', (route) => route.abort());
  await page.goto('/family');
  await expect(page.getByTestId('alerts')).toBeVisible({ timeout: 30_000 }); // first compile can be slow
  const before = await page.getByTestId('alert-card').count();

  const res = await request.post('/api/tools/escalate', { data: { issue: 'Smoke alarm is beeping' } });
  expect((await res.json()).ok).toBe(true);

  // No stream events can arrive, so only the 5-second poll can show this card.
  await expect(page.getByTestId('alert-card')).toHaveCount(before + 1, { timeout: 12_000 });
  await expect(page.getByTestId('alert-card').first()).toContainText('Smoke alarm is beeping');
});
